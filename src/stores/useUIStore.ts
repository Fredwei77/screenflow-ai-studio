import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'dark' | 'light';
  language: 'en' | 'zh';
  sidebarOpen: boolean;
  sidebarTab: 'chat' | 'participants';
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: 'chat' | 'participants') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      sidebarOpen: false,
      sidebarTab: 'chat',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setLanguage: (lang) => set({ language: lang }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setSidebarTab: (tab) => set({ sidebarTab: tab }),
    }),
    {
      name: 'screenflow-ui',
      partialize: (state) => ({ theme: state.theme, language: state.language }),
    }
  )
);
