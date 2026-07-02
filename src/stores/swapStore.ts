import { create } from "zustand";
import { getSwapEngine, configuredSwapMode } from "@/features/swap-engine";
import type { SwapStats } from "@/features/swap-engine";
import { estimatePointsUsed } from "@/features/credits/constants";
import type { Avatar } from "@/types/db";

export type SessionStatus = "idle" | "starting" | "active" | "stopping";

interface SwapState {
  /** Flux webcam brut (caméra réelle) */
  cameraStream: MediaStream | null;
  cameraError: string | null;
  /** Flux transformé (caméra CamAIvo) */
  outputStream: MediaStream | null;
  sessionStatus: SessionStatus;
  selectedAvatar: Avatar | null;
  elapsedSeconds: number;
  pointsUsed: number;
  stats: SwapStats;
  engineError: string | null;

  /** Demande l'accès webcam (getUserMedia) et stocke le flux. */
  enableCamera: () => Promise<void>;
  /** Sélectionne l'avatar cible — à chaud si une session est active. */
  selectAvatar: (avatar: Avatar) => Promise<void>;
  startSwap: () => Promise<void>;
  stopSwap: () => Promise<void>;
}

let tickTimer = 0;
let statsListenerAttached = false;

export const useSwapStore = create<SwapState>((set, get) => ({
  cameraStream: null,
  cameraError: null,
  outputStream: null,
  sessionStatus: "idle",
  selectedAvatar: null,
  elapsedSeconds: 0,
  pointsUsed: 0,
  stats: { fps: 0, latencyMs: 0, connection: "down" },
  engineError: null,

  enableCamera: async () => {
    set({ cameraError: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      set({ cameraStream: stream });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      set({
        cameraError:
          name === "NotAllowedError"
            ? "Permission caméra refusée. Autorise l'accès dans les réglages du navigateur puis réessaie."
            : name === "NotFoundError"
              ? "Aucune webcam détectée sur cet appareil."
              : "Impossible d'accéder à la caméra.",
      });
    }
  },

  selectAvatar: async (avatar) => {
    set({ selectedAvatar: avatar });
    // Changement à chaud pendant une session active
    if (get().sessionStatus === "active") {
      await getSwapEngine().setAvatar(avatar.id, avatar.image_url);
    }
  },

  startSwap: async () => {
    const { cameraStream, selectedAvatar, sessionStatus } = get();
    if (sessionStatus !== "idle" || !cameraStream || !selectedAvatar) return;

    set({ sessionStatus: "starting", engineError: null });
    const engine = getSwapEngine();

    if (!statsListenerAttached) {
      statsListenerAttached = true;
      engine.on("stats", (payload) => set({ stats: payload as SwapStats }));
      engine.on("error", (payload) =>
        set({ engineError: String(payload ?? "Erreur du moteur de swap") }),
      );
    }

    try {
      await engine.connect(configuredSwapMode);
      engine.setInputStream(cameraStream);
      await engine.setAvatar(selectedAvatar.id, selectedAvatar.image_url);

      set({
        outputStream: engine.getOutputStream(),
        sessionStatus: "active",
        elapsedSeconds: 0,
        pointsUsed: 0,
      });

      // Timer local : durée + estimation de points (le décompte serveur
      // via heartbeats arrive en Phase 3 et fera référence).
      tickTimer = window.setInterval(() => {
        const elapsed = get().elapsedSeconds + 1;
        set({ elapsedSeconds: elapsed, pointsUsed: estimatePointsUsed(elapsed) });
      }, 1000);
    } catch (err) {
      set({
        sessionStatus: "idle",
        engineError:
          err instanceof Error ? err.message : "Connexion au moteur impossible.",
      });
    }
  },

  stopSwap: async () => {
    if (get().sessionStatus !== "active") return;
    set({ sessionStatus: "stopping" });
    window.clearInterval(tickTimer);
    await getSwapEngine().disconnect();
    set({
      sessionStatus: "idle",
      outputStream: null,
      stats: { fps: 0, latencyMs: 0, connection: "down" },
    });
  },
}));
