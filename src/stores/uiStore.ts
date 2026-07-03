import { create } from "zustand";

interface UiState {
  /** Drawer mobile de la sidebar */
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
}));
