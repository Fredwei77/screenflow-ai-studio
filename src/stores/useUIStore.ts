import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  sidebarTab: 'chat' | 'participants';
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: 'chat' | 'participants') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: false,
      sidebarTab: 'chat',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setSidebarTab: (tab) => set({ sidebarTab: tab }),
    }),
    {
      name: 'screenflow-ui',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
