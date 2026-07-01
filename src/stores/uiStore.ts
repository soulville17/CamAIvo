import { create } from "zustand";

export type EngineMode = "cloud" | "local";

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
  engineMode: "cloud",
  toggleEngineMode: () =>
    set((s) => ({ engineMode: s.engineMode === "cloud" ? "local" : "cloud" })),
}));
