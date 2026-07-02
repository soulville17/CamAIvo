/**
 * Contrat de l'adaptateur moteur de swap (§9 du spec).
 * L'UI ne dépend QUE de cette interface : le moteur réel (local/cloud)
 * se branche sans réécrire l'app.
 */

export type SwapMode = "mock" | "local" | "cloud";

export type ConnectionQuality = "stable" | "unstable" | "down";

export interface SwapStats {
  fps: number;
  latencyMs: number;
  connection: ConnectionQuality;
}

export interface SwapOptions {
  /** Opacité de l'incrustation avatar (0–1) */
  transparency?: number;
  /** Netteté (0–1) */
  sharpness?: number;
  /** Masque bouche (garde la bouche réelle) */
  mouthMask?: boolean;
  /** Amélioration du visage (OFF par défaut — coûteux en GPU) */
  faceEnhancer?: boolean;
}

export type SwapEngineEvent = "connected" | "disconnected" | "error" | "stats";

export type SwapEngineListener = (payload?: unknown) => void;

export interface SwapEngine {
  connect(mode: SwapMode): Promise<void>;
  disconnect(): Promise<void>;
  /** Flux webcam brut en entrée */
  setInputStream(stream: MediaStream): void;
  /** Flux transformé en sortie (affiché dans la caméra CamAIvo) */
  getOutputStream(): MediaStream;
  setAvatar(avatarId: string, imageUrl: string): Promise<void>;
  setOptions(opts: SwapOptions): void;
  on(event: SwapEngineEvent, cb: SwapEngineListener): void;
  off(event: SwapEngineEvent, cb: SwapEngineListener): void;
  getStats(): SwapStats;
}
