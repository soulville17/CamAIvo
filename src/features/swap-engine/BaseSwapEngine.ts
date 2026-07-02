import type {
  SwapEngine,
  SwapEngineEvent,
  SwapEngineListener,
  SwapMode,
  SwapOptions,
  SwapStats,
} from "@/features/swap-engine/types";

/** Plomberie commune aux moteurs : événements + stats + options. */
export abstract class BaseSwapEngine implements SwapEngine {
  protected stats: SwapStats = { fps: 0, latencyMs: 0, connection: "down" };
  protected options: Required<
    Pick<SwapOptions, "transparency" | "sharpness" | "mouthMask" | "faceEnhancer">
  > &
    SwapOptions = {
    transparency: 0.85,
    sharpness: 0.5,
    mouthMask: false,
    faceEnhancer: false,
    targetFps: 20,
    width: 640,
    height: 480,
  };
  private listeners = new Map<SwapEngineEvent, Set<SwapEngineListener>>();

  abstract connect(mode: SwapMode): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract setInputStream(stream: MediaStream): void;
  abstract getOutputStream(): MediaStream;
  abstract setAvatar(avatarId: string, imageUrl: string): Promise<void>;

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

  protected emit(event: SwapEngineEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}
