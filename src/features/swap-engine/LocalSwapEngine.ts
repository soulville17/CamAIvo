import { BaseSwapEngine } from "@/features/swap-engine/BaseSwapEngine";
import type { SwapMode, SwapOptions } from "@/features/swap-engine/types";

const CONNECT_TIMEOUT_MS = 5000;
const AVATAR_ACK_TIMEOUT_MS = 3000;
/** Backpressure : on saute des frames si le buffer WS dépasse ce seuil. */
const MAX_BUFFERED_BYTES = 256 * 1024;

/**
 * Moteur LOCAL — se connecte au sidecar Python CamAIvo (insightface /
 * inswapper_128) via WebSocket (VITE_LOCAL_SWAP_WS, défaut ws://127.0.0.1:8787).
 *
 * Protocole (détail complet : docs/SWAP_ENGINE_PROTOCOL.md) :
 *  Client → sidecar : JSON {init, set_avatar, options, stop} + frames JPEG binaires
 *  Sidecar → client : JSON {ready, avatar_ready, stats, error} + frames JPEG binaires
 */
export class LocalSwapEngine extends BaseSwapEngine {
  private ws: WebSocket | null = null;
  private inputVideo: HTMLVideoElement;
  private captureCanvas: HTMLCanvasElement;
  private captureCtx: CanvasRenderingContext2D;
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private sendTimer = 0;
  private receivedFrames = 0;
  private fpsTimer = 0;
  private avatarAck: (() => void) | null = null;

  constructor() {
    super();
    this.inputVideo = document.createElement("video");
    this.inputVideo.muted = true;
    this.inputVideo.playsInline = true;

    this.captureCanvas = document.createElement("canvas");
    const cctx = this.captureCanvas.getContext("2d");
    this.outputCanvas = document.createElement("canvas");
    this.outputCanvas.width = 640;
    this.outputCanvas.height = 480;
    const octx = this.outputCanvas.getContext("2d");
    if (!cctx || !octx) throw new Error("Canvas 2D non supporté par ce navigateur");
    this.captureCtx = cctx;
    this.outputCtx = octx;
  }

  async connect(_mode: SwapMode): Promise<void> {
    const url = import.meta.env.VITE_LOCAL_SWAP_WS ?? "ws://127.0.0.1:8787";

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      const timeout = window.setTimeout(() => {
        ws.close();
        reject(
          new Error(
            "Moteur local injoignable : lance le sidecar CamAIvo puis réessaie.",
          ),
        );
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        // Handshake : options courantes envoyées à l'init
        ws.send(JSON.stringify({ type: "init", options: this.serializeOptions() }));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data) as { type: string; [k: string]: unknown };
          if (msg.type === "ready") {
            window.clearTimeout(timeout);
            this.onConnected();
            resolve();
            return;
          }
          this.handleControlMessage(msg);
        } else {
          this.drawOutputFrame(event.data as ArrayBuffer);
        }
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        reject(
          new Error(
            "Moteur local injoignable : lance le sidecar CamAIvo puis réessaie.",
          ),
        );
      };

      ws.onclose = () => {
        // Coupure après connexion établie
        if (this.stats.connection !== "down") {
          this.stats = { fps: 0, latencyMs: 0, connection: "down" };
          this.emit("error", "Connexion au moteur local perdue.");
          this.emit("disconnected");
        }
      };
    });
  }

  private onConnected(): void {
    this.stats = { fps: 0, latencyMs: 0, connection: "stable" };
    this.startFramePump();
    // FPS de sortie mesuré localement (le sidecar envoie aussi ses stats)
    this.fpsTimer = window.setInterval(() => {
      this.stats = { ...this.stats, fps: this.receivedFrames };
      this.receivedFrames = 0;
      this.emit("stats", this.stats);
    }, 1000);
    this.emit("connected");
  }

  private handleControlMessage(msg: { type: string; [k: string]: unknown }): void {
    switch (msg.type) {
      case "avatar_ready":
        this.avatarAck?.();
        this.avatarAck = null;
        break;
      case "stats":
        this.stats = {
          fps: Number(msg.fps ?? this.stats.fps),
          latencyMs: Number(msg.latency_ms ?? this.stats.latencyMs),
          connection: this.stats.connection,
        };
        this.emit("stats", this.stats);
        break;
      case "error":
        this.emit("error", String(msg.message ?? "Erreur du moteur local"));
        break;
    }
  }

  private drawOutputFrame(data: ArrayBuffer): void {
    void createImageBitmap(new Blob([data], { type: "image/jpeg" }))
      .then((bitmap) => {
        if (
          this.outputCanvas.width !== bitmap.width ||
          this.outputCanvas.height !== bitmap.height
        ) {
          this.outputCanvas.width = bitmap.width;
          this.outputCanvas.height = bitmap.height;
        }
        this.outputCtx.drawImage(bitmap, 0, 0);
        bitmap.close();
        this.receivedFrames += 1;
      })
      .catch(() => {
        /* frame corrompue : ignorée */
      });
  }

  /** Pompe d'envoi : capture la webcam en JPEG à la cadence cible. */
  private startFramePump(): void {
    const fps = this.options.targetFps ?? 20;
    this.sendTimer = window.setInterval(() => {
      const ws = this.ws;
      if (
        !ws ||
        ws.readyState !== WebSocket.OPEN ||
        ws.bufferedAmount > MAX_BUFFERED_BYTES ||
        this.inputVideo.readyState < 2
      ) {
        return;
      }
      const w = this.options.width ?? 640;
      const h = this.options.height ?? 480;
      if (this.captureCanvas.width !== w) this.captureCanvas.width = w;
      if (this.captureCanvas.height !== h) this.captureCanvas.height = h;
      this.captureCtx.drawImage(this.inputVideo, 0, 0, w, h);
      this.captureCanvas.toBlob(
        (blob) => {
          if (blob && ws.readyState === WebSocket.OPEN) {
            void blob.arrayBuffer().then((buf) => ws.send(buf));
          }
        },
        "image/jpeg",
        0.7,
      );
    }, 1000 / fps);
  }

  async disconnect(): Promise<void> {
    window.clearInterval(this.sendTimer);
    window.clearInterval(this.fpsTimer);
    this.stats = { fps: 0, latencyMs: 0, connection: "down" };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
    }
    this.ws?.close();
    this.ws = null;
    this.emit("disconnected");
  }

  setInputStream(stream: MediaStream): void {
    this.inputVideo.srcObject = stream;
    void this.inputVideo.play().catch(() => {
      /* autoplay silencieux */
    });
  }

  getOutputStream(): MediaStream {
    if (!this.outputStream) {
      this.outputStream = this.outputCanvas.captureStream(30);
    }
    return this.outputStream;
  }

  /** Envoie l'image source en base64 : le sidecar extrait l'embedding du visage. */
  async setAvatar(avatarId: string, imageUrl: string): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("Moteur local non connecté.");
    }
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Impossible de charger l'image de l'avatar");
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Lecture de l'image impossible"));
      reader.readAsDataURL(blob);
    });

    ws.send(JSON.stringify({ type: "set_avatar", avatar_id: avatarId, image: dataUrl }));

    // Attend l'ack `avatar_ready` (sinon on continue après timeout : le
    // sidecar peut être en train de calculer l'embedding)
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(() => {
        this.avatarAck = null;
        resolve();
      }, AVATAR_ACK_TIMEOUT_MS);
      this.avatarAck = () => {
        window.clearTimeout(timeout);
        resolve();
      };
    });
  }

  setOptions(opts: SwapOptions): void {
    super.setOptions(opts);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ type: "options", options: this.serializeOptions() }),
      );
    }
  }

  private serializeOptions(): Record<string, unknown> {
    return {
      transparency: this.options.transparency,
      sharpness: this.options.sharpness,
      mouth_mask: this.options.mouthMask,
      face_enhancer: this.options.faceEnhancer,
      det_size: [320, 320],
      max_faces: 1,
      target_fps: this.options.targetFps ?? 20,
    };
  }
}
