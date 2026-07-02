import { BaseSwapEngine } from "@/features/swap-engine/BaseSwapEngine";
import type { SwapMode, SwapOptions } from "@/features/swap-engine/types";

const CONNECT_TIMEOUT_MS = 8000;

/**
 * Moteur CLOUD — signalisation WebSocket (VITE_SIGNALING_WS) puis WebRTC
 * vers un worker GPU distant (ex. RunPod). On envoie la piste webcam, on
 * reçoit la piste transformée. Le worker GPU est hors périmètre de cette
 * app : ce client implémente le contrat documenté dans
 * docs/SWAP_ENGINE_PROTOCOL.md.
 */
export class CloudSwapEngine extends BaseSwapEngine {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private control: RTCDataChannel | null = null;
  private inputStream: MediaStream | null = null;
  private remoteStream = new MediaStream();
  private statsTimer = 0;
  private negotiated = false;

  async connect(_mode: SwapMode): Promise<void> {
    const url = import.meta.env.VITE_SIGNALING_WS;
    if (!url) {
      throw new Error(
        "Mode cloud non configuré : renseigne VITE_SIGNALING_WS (serveur de signalisation).",
      );
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      const timeout = window.setTimeout(() => {
        ws.close();
        reject(new Error("Serveur de signalisation injoignable."));
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", role: "client" }));
        this.setupPeerConnection();
        window.clearTimeout(timeout);
        this.stats = { fps: 0, latencyMs: 0, connection: "unstable" };
        this.startStatsLoop();
        this.emit("connected");
        resolve();
      };

      ws.onmessage = (event) => {
        void this.handleSignaling(JSON.parse(String(event.data)));
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Serveur de signalisation injoignable."));
      };

      ws.onclose = () => {
        if (this.stats.connection !== "down") {
          this.stats = { fps: 0, latencyMs: 0, connection: "down" };
          this.emit("error", "Signalisation cloud perdue.");
          this.emit("disconnected");
        }
      };
    });
  }

  private setupPeerConnection(): void {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      // TODO : ajouter un TURN (credentials côté serveur) pour les NAT stricts
    });
    this.pc = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
      }
    };

    pc.ontrack = (e) => {
      for (const track of e.streams[0]?.getTracks() ?? [e.track]) {
        this.remoteStream.addTrack(track);
      }
    };

    pc.onconnectionstatechange = () => {
      const map: Record<RTCPeerConnectionState, typeof this.stats.connection> = {
        new: "unstable",
        connecting: "unstable",
        connected: "stable",
        disconnected: "unstable",
        failed: "down",
        closed: "down",
      };
      this.stats = { ...this.stats, connection: map[pc.connectionState] };
      if (pc.connectionState === "failed") {
        this.emit("error", "Connexion WebRTC au worker GPU en échec.");
      }
      this.emit("stats", this.stats);
    };

    // Canal de contrôle : set_avatar / options sans repasser par la signalisation
    this.control = pc.createDataChannel("control");

    if (this.inputStream) void this.negotiate();
  }

  private async negotiate(): Promise<void> {
    const pc = this.pc;
    const stream = this.inputStream;
    if (!pc || !stream || this.negotiated) return;
    this.negotiated = true;

    for (const track of stream.getVideoTracks()) {
      pc.addTrack(track, stream);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.ws?.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
  }

  private async handleSignaling(msg: {
    type: string;
    [k: string]: unknown;
  }): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      if (msg.type === "answer") {
        await pc.setRemoteDescription({ type: "answer", sdp: String(msg.sdp) });
      } else if (msg.type === "ice" && msg.candidate) {
        await pc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
      } else if (msg.type === "error") {
        this.emit("error", String(msg.message ?? "Erreur du worker cloud"));
      }
    } catch (err) {
      this.emit(
        "error",
        err instanceof Error ? err.message : "Erreur de signalisation WebRTC",
      );
    }
  }

  /** fps / latence lus depuis les stats WebRTC (inbound-rtp + candidate-pair). */
  private startStatsLoop(): void {
    this.statsTimer = window.setInterval(() => {
      const pc = this.pc;
      if (!pc || pc.connectionState !== "connected") return;
      void pc.getStats().then((report) => {
        let fps = this.stats.fps;
        let latencyMs = this.stats.latencyMs;
        report.forEach((s) => {
          if (s.type === "inbound-rtp" && s.kind === "video" && s.framesPerSecond) {
            fps = Math.round(s.framesPerSecond);
          }
          if (s.type === "candidate-pair" && s.state === "succeeded" && s.currentRoundTripTime) {
            latencyMs = Math.round(s.currentRoundTripTime * 1000);
          }
        });
        this.stats = { ...this.stats, fps, latencyMs };
        this.emit("stats", this.stats);
      });
    }, 1000);
  }

  async disconnect(): Promise<void> {
    window.clearInterval(this.statsTimer);
    this.control?.close();
    this.pc?.close();
    this.ws?.close();
    this.pc = null;
    this.ws = null;
    this.control = null;
    this.negotiated = false;
    this.remoteStream = new MediaStream();
    this.stats = { fps: 0, latencyMs: 0, connection: "down" };
    this.emit("disconnected");
  }

  setInputStream(stream: MediaStream): void {
    this.inputStream = stream;
    if (this.pc) void this.negotiate();
  }

  getOutputStream(): MediaStream {
    return this.remoteStream;
  }

  async setAvatar(avatarId: string, imageUrl: string): Promise<void> {
    // Le worker GPU télécharge l'image lui-même (URL publique Supabase Storage)
    const payload = JSON.stringify({
      type: "set_avatar",
      avatar_id: avatarId,
      image_url: imageUrl,
    });
    if (this.control?.readyState === "open") {
      this.control.send(payload);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      throw new Error("Moteur cloud non connecté.");
    }
  }

  setOptions(opts: SwapOptions): void {
    super.setOptions(opts);
    const payload = JSON.stringify({
      type: "options",
      options: {
        transparency: this.options.transparency,
        sharpness: this.options.sharpness,
        mouth_mask: this.options.mouthMask,
        face_enhancer: this.options.faceEnhancer,
      },
    });
    if (this.control?.readyState === "open") {
      this.control.send(payload);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
  }
}
