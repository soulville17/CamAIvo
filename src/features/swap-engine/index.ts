import { MockSwapEngine } from "@/features/swap-engine/MockSwapEngine";
import { LocalSwapEngine } from "@/features/swap-engine/LocalSwapEngine";
import { CloudSwapEngine } from "@/features/swap-engine/CloudSwapEngine";
import type { SwapEngine, SwapMode } from "@/features/swap-engine/types";

export type { SwapEngine, SwapMode, SwapOptions, SwapStats } from "@/features/swap-engine/types";

/**
 * Mode par défaut configuré au build (mock : app 100 % testable sans GPU).
 * L'utilisateur peut changer de pipeline à chaud dans Paramètres
 * (settingsStore.enginePipeline).
 */
export const configuredSwapMode: SwapMode = import.meta.env.VITE_SWAP_MODE ?? "mock";

let current: { mode: SwapMode; engine: SwapEngine } | null = null;

function createEngine(mode: SwapMode): SwapEngine {
  switch (mode) {
    case "local":
      return new LocalSwapEngine();
    case "cloud":
      return new CloudSwapEngine();
    default:
      return new MockSwapEngine();
  }
}

/**
 * Fabrique du moteur (instance courante, recréée si le mode change).
 * Sans argument : renvoie l'instance courante (ou un mock par défaut).
 */
export function getSwapEngine(mode?: SwapMode): SwapEngine {
  const target = mode ?? current?.mode ?? configuredSwapMode;
  if (!current || current.mode !== target) {
    current = { mode: target, engine: createEngine(target) };
  }
  return current.engine;
}
