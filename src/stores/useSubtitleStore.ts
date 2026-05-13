import { create } from 'zustand';
import type { SubtitleEntry } from '../types';

export const MAX_VISIBLE_SUBTITLES = 5;

interface DisplaySubtitle {
  id: string;
  text: string;
  userName: string;
  opacity: number;
}

interface SubtitleState {
  subtitles: SubtitleEntry[];
  isSubtitleEnabled: boolean;
  remoteInterims: Record<string, { text: string; userName: string }>;
  isVisible: boolean;
  subtitleAutoHideMs: number;
  speechLangOverride: string | null;

  addSubtitle: (entry: SubtitleEntry) => void;
  updateSubtitle: (id: string, updates: Partial<SubtitleEntry>) => void;
  clearSubtitles: () => void;
  toggleSubtitles: () => void;
  setSubtitlesEnabled: (enabled: boolean) => void;
  setRemoteInterim: (userId: string, text: string, userName: string) => void;
  clearRemoteInterim: (userId: string) => void;
  clearAllRemoteInterims: () => void;
  markVisible: () => void;
  setSubtitleAutoHideMs: (ms: number) => void;
  setSpeechLangOverride: (lang: string | null) => void;
  reset: () => void;
}

export const selectVisibleSubtitles = (state: SubtitleState): DisplaySubtitle[] => {
  const finalSubtitles = state.subtitles.filter((s) => s.isFinal);
  const visible = finalSubtitles.slice(-MAX_VISIBLE_SUBTITLES);
  const count = visible.length;
  return visible.map((entry, index) => ({
    id: entry.id,
    text: entry.text,
    userName: entry.userName,
    opacity: count <= 1 ? 1.0 : 0.4 + 0.6 * (index / (count - 1)),
  }));
};

export const useSubtitleStore = create<SubtitleState>()((set) => ({
  subtitles: [],
  isSubtitleEnabled: false,
  remoteInterims: {},
  isVisible: false,
  subtitleAutoHideMs: 6000,
  speechLangOverride: null,

  addSubtitle: (entry) => set((state) => ({
    subtitles: [...state.subtitles.slice(-50), entry],
  })),
  updateSubtitle: (id, updates) => set((state) => ({
    subtitles: state.subtitles.map((s) => s.id === id ? { ...s, ...updates } : s),
  })),
  clearSubtitles: () => set({ subtitles: [] }),
  toggleSubtitles: () => set((state) => {
    const next = !state.isSubtitleEnabled;
    return {
      isSubtitleEnabled: next,
      isVisible: next ? state.isVisible : false,
      remoteInterims: next ? state.remoteInterims : {},
    };
  }),
  setSubtitlesEnabled: (isSubtitleEnabled) => set({ isSubtitleEnabled }),
  setRemoteInterim: (userId, text, userName) => set((state) => ({
    remoteInterims: { ...state.remoteInterims, [userId]: { text, userName } },
  })),
  clearRemoteInterim: (userId) => set((state) => {
    const { [userId]: _, ...rest } = state.remoteInterims;
    return { remoteInterims: rest };
  }),
  clearAllRemoteInterims: () => set({ remoteInterims: {} }),
  markVisible: () => set({ isVisible: true }),
  setSubtitleAutoHideMs: (subtitleAutoHideMs) => set({ subtitleAutoHideMs }),
  setSpeechLangOverride: (speechLangOverride) => set({ speechLangOverride }),
  reset: () => set({
    subtitles: [],
    isSubtitleEnabled: false,
    remoteInterims: {},
    isVisible: false,
    speechLangOverride: null,
  }),
}));
