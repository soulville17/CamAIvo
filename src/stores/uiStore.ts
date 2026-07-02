import { create } from "zustand";

export type EngineMode = "cloud" | "local";

/** Mode initial du toggle : suit VITE_SWAP_MODE si local/cloud, sinon cloud. */
const initialEngineMode: EngineMode =
  import.meta.env.VITE_SWAP_MODE === "local" ? "local" : "cloud";

interface UiState {
  /** Drawer mobile de la sidebar */
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  /** Toggle CLOUD / LOCAL du header (branché au SwapEngine en Phase 7) */
  engineMode: EngineMode;
  toggleEngineMode: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  engineMode: initialEngineMode,
  toggleEngineMode: () =>
    set((s) => ({ engineMode: s.engineMode === "cloud" ? "local" : "cloud" })),
}));
