import { MockSwapEngine } from "@/features/swap-engine/MockSwapEngine";
import type { SwapEngine, SwapMode } from "@/features/swap-engine/types";

export type { SwapEngine, SwapMode, SwapOptions, SwapStats } from "@/features/swap-engine/types";

/** Mode configuré au build (mock par défaut : app 100 % testable sans GPU). */
export const configuredSwapMode: SwapMode = import.meta.env.VITE_SWAP_MODE ?? "mock";

let instance: SwapEngine | null = null;

/**
 * Fabrique du moteur de swap (singleton).
 * Phase 7 : ajoutera LocalSwapEngine (WebSocket sidecar Python) et
 * CloudSwapEngine (WebRTC vers worker GPU) selon le mode.
 */
export function getSwapEngine(): SwapEngine {
  if (!instance) {
    // TODO Phase 7 : switch (configuredSwapMode) → Local / Cloud
    instance = new MockSwapEngine();
  }
  return instance;
}
