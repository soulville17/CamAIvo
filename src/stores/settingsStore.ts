import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSwapEngine } from "@/features/swap-engine";

export type Resolution = "640x480" | "1280x720" | "1920x1080";

/**
 * Préférences de swap (persistées en localStorage).
 * Défauts §8.4 : 640×480 @ 20 fps, face enhancer OFF, det_size 320×320,
 * 1 seul visage max, filigrane activé.
 */
interface SettingsState {
  cameraDeviceId: string | null;
  resolution: Resolution;
  targetFps: 20 | 30;
  /** Opacité de l'incrustation avatar (0–1) */
  transparency: number;
  /** Netteté (0–1) */
  sharpness: number;
  mouthMask: boolean;
  faceEnhancer: boolean;
  watermarkEnabled: boolean;

  setCameraDeviceId: (id: string | null) => void;
  setResolution: (r: Resolution) => void;
  setTargetFps: (fps: 20 | 30) => void;
  setEngineOption: (
    key: "transparency" | "sharpness" | "mouthMask" | "faceEnhancer",
    value: number | boolean,
  ) => void;
  setWatermarkEnabled: (enabled: boolean) => void;
}

/** Contraintes fixes du moteur (non configurables, affichées à titre indicatif). */
export const ENGINE_CONSTANTS = {
  detSize: "320×320",
  maxFaces: 1,
} as const;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      cameraDeviceId: null,
      resolution: "640x480",
      targetFps: 20,
      transparency: 0.85,
      sharpness: 0.5,
      mouthMask: false,
      faceEnhancer: false, // OFF par défaut (coûteux en GPU)
      watermarkEnabled: true,

      setCameraDeviceId: (id) => set({ cameraDeviceId: id }),
      setResolution: (r) => set({ resolution: r }),
      setTargetFps: (fps) => set({ targetFps: fps }),

      setEngineOption: (key, value) => {
        set({ [key]: value } as Partial<SettingsState>);
        // Application à chaud sur le moteur (sans effet si déconnecté)
        const { transparency, sharpness, mouthMask, faceEnhancer } = get();
        getSwapEngine().setOptions({ transparency, sharpness, mouthMask, faceEnhancer });
      },

      setWatermarkEnabled: (enabled) => set({ watermarkEnabled: enabled }),
    }),
    { name: "camaivo-settings" },
  ),
);
