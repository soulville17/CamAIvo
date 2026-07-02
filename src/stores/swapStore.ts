import { create } from "zustand";
import { getSwapEngine, configuredSwapMode } from "@/features/swap-engine";
import type { SwapStats } from "@/features/swap-engine";
import { estimatePointsUsed, HEARTBEAT_INTERVAL_S } from "@/features/credits/constants";
import { createSwapSession, sendSessionTick } from "@/features/credits/sessionsApi";
import { useAuthStore } from "@/features/auth/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Avatar } from "@/types/db";

export type SessionStatus = "idle" | "starting" | "active" | "stopping";

interface SwapState {
  /** Flux webcam brut (caméra réelle) */
  cameraStream: MediaStream | null;
  cameraError: string | null;
  /** Flux transformé (caméra CamAIvo) */
  outputStream: MediaStream | null;
  sessionStatus: SessionStatus;
  /** Id de la ligne swap_sessions en cours (source de vérité serveur) */
  sessionId: string | null;
  selectedAvatar: Avatar | null;
  elapsedSeconds: number;
  /** Points consommés — valeur SERVEUR à chaque heartbeat, estimée entre deux */
  pointsUsed: number;
  stats: SwapStats;
  engineError: string | null;
  /** true quand la session vient d'être coupée pour solde épuisé */
  depleted: boolean;

  /** Demande l'accès webcam (getUserMedia) et stocke le flux. */
  enableCamera: () => Promise<void>;
  /** Sélectionne l'avatar cible — à chaud si une session est active. */
  selectAvatar: (avatar: Avatar) => Promise<void>;
  startSwap: () => Promise<void>;
  stopSwap: () => Promise<void>;
}

let tickTimer = 0;
let heartbeatTimer = 0;
let statsListenerAttached = false;
/** Base serveur des points consommés + secondes locales depuis ce point. */
let serverPointsUsed = 0;
let secondsSinceServerSync = 0;

function clearTimers(): void {
  window.clearInterval(tickTimer);
  window.clearInterval(heartbeatTimer);
}

export const useSwapStore = create<SwapState>((set, get) => ({
  cameraStream: null,
  cameraError: null,
  outputStream: null,
  sessionStatus: "idle",
  sessionId: null,
  selectedAvatar: null,
  elapsedSeconds: 0,
  pointsUsed: 0,
  stats: { fps: 0, latencyMs: 0, connection: "down" },
  engineError: null,
  depleted: false,

  enableCamera: async () => {
    set({ cameraError: null });
    try {
      // Contraintes issues des préférences (webcam, résolution, fps — §8.4)
      const { cameraDeviceId, resolution, targetFps } = useSettingsStore.getState();
      const [width = 640, height = 480] = resolution.split("x").map(Number);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : {}),
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: targetFps },
        },
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
    const userId = useAuthStore.getState().user?.id;
    if (sessionStatus !== "idle" || !cameraStream || !selectedAvatar || !userId) {
      return;
    }

    set({ sessionStatus: "starting", engineError: null, depleted: false });

    // 1. Session côté serveur (le décompte de points s'y rattache)
    const { sessionId, error: sessionError } = await createSwapSession(
      userId,
      selectedAvatar.id,
      configuredSwapMode,
    );
    if (!sessionId) {
      set({ sessionStatus: "idle", engineError: sessionError });
      return;
    }

    // 2. Connexion au moteur de swap
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
      // Options des Paramètres appliquées à la session
      const { transparency, sharpness, mouthMask, faceEnhancer } =
        useSettingsStore.getState();
      engine.setOptions({ transparency, sharpness, mouthMask, faceEnhancer });
    } catch (err) {
      set({
        sessionStatus: "idle",
        engineError:
          err instanceof Error ? err.message : "Connexion au moteur impossible.",
      });
      // Clôt la session créée pour ne pas laisser une session fantôme
      void sendSessionTick(sessionId, "stop");
      return;
    }

    serverPointsUsed = 0;
    secondsSinceServerSync = 0;
    set({
      outputStream: engine.getOutputStream(),
      sessionStatus: "active",
      sessionId,
      elapsedSeconds: 0,
      pointsUsed: 0,
    });

    // 3. Timer d'affichage : secondes + estimation entre deux heartbeats
    tickTimer = window.setInterval(() => {
      secondsSinceServerSync += 1;
      set({
        elapsedSeconds: get().elapsedSeconds + 1,
        pointsUsed: serverPointsUsed + estimatePointsUsed(secondsSinceServerSync),
      });
    }, 1000);

    // 4. Heartbeats : le serveur débite et fait référence
    heartbeatTimer = window.setInterval(() => {
      void (async () => {
        const currentId = get().sessionId;
        if (!currentId || get().sessionStatus !== "active") return;

        const { data } = await sendSessionTick(currentId, "heartbeat");
        if (!data) return; // réseau en échec : on continue, la prochaine tranche est bornée à 30 s

        if (typeof data.balance === "number") {
          useAuthStore.getState().setPointsBalance(data.balance);
        }
        if (typeof data.points_used === "number") {
          serverPointsUsed = data.points_used;
          secondsSinceServerSync = 0;
          set({ pointsUsed: data.points_used });
        }

        // Solde épuisé (ou session close côté serveur) → coupure immédiate
        if (data.depleted || data.ended || data.error === "session_already_ended") {
          clearTimers();
          await getSwapEngine().disconnect();
          set({
            sessionStatus: "idle",
            sessionId: null,
            outputStream: null,
            depleted: data.depleted ?? true,
            stats: { fps: 0, latencyMs: 0, connection: "down" },
          });
        }
      })();
    }, HEARTBEAT_INTERVAL_S * 1000);
  },

  stopSwap: async () => {
    const { sessionStatus, sessionId } = get();
    if (sessionStatus !== "active") return;

    set({ sessionStatus: "stopping" });
    clearTimers();
    await getSwapEngine().disconnect();

    // Facture la dernière tranche et clôt la session côté serveur
    if (sessionId) {
      const { data } = await sendSessionTick(sessionId, "stop");
      if (data && typeof data.balance === "number") {
        useAuthStore.getState().setPointsBalance(data.balance);
      }
      if (data && typeof data.points_used === "number") {
        set({ pointsUsed: data.points_used });
      }
    }

    set({
      sessionStatus: "idle",
      sessionId: null,
      outputStream: null,
      stats: { fps: 0, latencyMs: 0, connection: "down" },
    });
  },
}));
