import type {
  SwapEngine,
  SwapEngineEvent,
  SwapEngineListener,
  SwapMode,
  SwapOptions,
  SwapStats,
} from "@/features/swap-engine/types";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const OUTPUT_FPS = 30;

/**
 * Moteur de swap SIMULÉ (VITE_SWAP_MODE=mock).
 * Dessine la webcam dans un canvas, applique une teinte chaude + incrustation
 * de l'avatar, et renvoie le résultat via canvas.captureStream(30).
 * Permet de démontrer TOUTE l'app sans GPU ni serveur.
 */
export class MockSwapEngine implements SwapEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private avatarImg: HTMLImageElement | null = null;
  private outputStream: MediaStream | null = null;
  private rafId = 0;
  private statsTimer = 0;
  private connected = false;
  private options: Required<SwapOptions> = {
    transparency: 0.85,
    sharpness: 0.5,
    mouthMask: false,
    faceEnhancer: false,
  };
  private stats: SwapStats = { fps: 0, latencyMs: 0, connection: "down" };
  private listeners = new Map<SwapEngineEvent, Set<SwapEngineListener>>();

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D non supporté par ce navigateur");
    this.ctx = ctx;

    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
  }

  async connect(_mode: SwapMode): Promise<void> {
    // Simule le handshake avec un moteur distant
    await new Promise((r) => setTimeout(r, 600));
    this.connected = true;
    this.startRenderLoop();
    this.startStatsLoop();
    this.emit("connected");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    cancelAnimationFrame(this.rafId);
    window.clearInterval(this.statsTimer);
    this.stats = { fps: 0, latencyMs: 0, connection: "down" };
    this.emit("disconnected");
  }

  setInputStream(stream: MediaStream): void {
    this.video.srcObject = stream;
    void this.video.play().catch(() => {
      /* lecture bloquée tant que l'utilisateur n'a pas interagi — sans gravité */
    });
  }

  getOutputStream(): MediaStream {
    if (!this.outputStream) {
      this.outputStream = this.canvas.captureStream(OUTPUT_FPS);
    }
    return this.outputStream;
  }

  async setAvatar(_avatarId: string, imageUrl: string): Promise<void> {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("Impossible de charger l'image de l'avatar"));
      img.src = imageUrl;
    });
    this.avatarImg = img;
  }

  setOptions(opts: SwapOptions): void {
    this.options = { ...this.options, ...opts };
  }

  on(event: SwapEngineEvent, cb: SwapEngineListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(cb);
  }

  off(event: SwapEngineEvent, cb: SwapEngineListener): void {
    this.listeners.get(event)?.delete(cb);
  }

  getStats(): SwapStats {
    return this.stats;
  }

  private emit(event: SwapEngineEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }

  /** Boucle de rendu : webcam + teinte chaude + incrustation avatar. */
  private startRenderLoop(): void {
    const draw = () => {
      if (!this.connected) return;
      const { ctx, canvas } = this;

      // 1. Frame webcam (ou fond sombre si pas encore de flux)
      if (this.video.readyState >= 2) {
        ctx.filter = `saturate(1.25) contrast(1.08) brightness(1.02) blur(${(1 - this.options.sharpness) * 0.6}px)`;
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else {
        ctx.fillStyle = "#0E1117";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Teinte chaude "CamAIvo" en overlay
      ctx.globalCompositeOperation = "overlay";
      const tint = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      tint.addColorStop(0, "rgba(255,90,31,0.16)");
      tint.addColorStop(1, "rgba(255,122,0,0.10)");
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";

      // 3. Incrustation de l'avatar : fantôme centré (simule le visage swappé)
      //    + vignette nette en haut à droite (cible sélectionnée)
      if (this.avatarImg) {
        const ghostSize = canvas.height * 0.55;
        ctx.globalAlpha = 0.2 * this.options.transparency;
        ctx.drawImage(
          this.avatarImg,
          (canvas.width - ghostSize) / 2,
          canvas.height * 0.08,
          ghostSize,
          ghostSize,
        );

        const thumbSize = 72;
        ctx.globalAlpha = this.options.transparency;
        ctx.drawImage(this.avatarImg, canvas.width - thumbSize - 12, 12, thumbSize, thumbSize);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,90,31,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - thumbSize - 12, 12, thumbSize, thumbSize);
      }

      this.rafId = requestAnimationFrame(draw);
    };
    draw();
  }

  /** Stats simulées : ~30 fps, ~40 ms, connexion stable. */
  private startStatsLoop(): void {
    this.statsTimer = window.setInterval(() => {
      if (!this.connected) return;
      this.stats = {
        fps: 29 + Math.round(Math.random() * 2),
        latencyMs: 35 + Math.round(Math.random() * 15),
        connection: "stable",
      };
      this.emit("stats", this.stats);
    }, 1000);
  }
}
