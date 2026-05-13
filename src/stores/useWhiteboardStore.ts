import { create } from 'zustand';
import type { DrawStroke, DrawTool } from '../types';

interface WhiteboardState {
  strokes: DrawStroke[];
  currentTool: DrawTool;
  currentColor: string;
  lineWidth: number;
  isWhiteboardOpen: boolean;

  addStroke: (stroke: DrawStroke) => void;
  loadStrokes: (strokes: DrawStroke[]) => void;
  clearStrokes: () => void;
  setTool: (tool: DrawTool) => void;
  setColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  toggleWhiteboard: () => void;
  setWhiteboardOpen: (open: boolean) => void;
  reset: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>()((set) => ({
  strokes: [],
  currentTool: 'pen',
  currentColor: '#ffffff',
  lineWidth: 3,
  isWhiteboardOpen: false,

  addStroke: (stroke) => set((state) => ({ strokes: [...state.strokes, stroke] })),
  loadStrokes: (strokes) => set({ strokes }),
  clearStrokes: () => set({ strokes: [] }),
  setTool: (currentTool) => set({ currentTool }),
  setColor: (currentColor) => set({ currentColor }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  toggleWhiteboard: () => set((state) => ({ isWhiteboardOpen: !state.isWhiteboardOpen })),
  setWhiteboardOpen: (isWhiteboardOpen) => set({ isWhiteboardOpen }),
  reset: () => set({ strokes: [], isWhiteboardOpen: false }),
}));
