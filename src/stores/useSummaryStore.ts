import { create } from 'zustand';

interface SummaryState {
  summary: string | null;
  isGenerating: boolean;
  isSummaryModalOpen: boolean;
  transcript: string;

  setSummary: (content: string | null) => void;
  setGenerating: (flag: boolean) => void;
  setTranscript: (text: string) => void;
  appendTranscript: (text: string) => void;
  toggleSummaryModal: () => void;
  setSummaryModalOpen: (open: boolean) => void;
  reset: () => void;
}

export const useSummaryStore = create<SummaryState>()((set) => ({
  summary: null,
  isGenerating: false,
  isSummaryModalOpen: false,
  transcript: '',

  setSummary: (summary) => set({ summary }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setTranscript: (transcript) => set({ transcript }),
  appendTranscript: (text) => set((state) => ({ transcript: state.transcript + text })),
  toggleSummaryModal: () => set((state) => ({ isSummaryModalOpen: !state.isSummaryModalOpen })),
  setSummaryModalOpen: (isSummaryModalOpen) => set({ isSummaryModalOpen }),
  reset: () => set({ summary: null, isGenerating: false, isSummaryModalOpen: false, transcript: '' }),
}));
