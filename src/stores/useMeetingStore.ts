import { create } from 'zustand';
import type { Participant, Room } from '../types';

export type BackgroundMode = 'none' | 'blur' | 'solid' | 'image';

interface MeetingState {
  currentRoom: Room | null;
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  virtualBgMode: BackgroundMode;
  virtualBgColor: string;
  virtualBgImageUrl: string | null;

  setCurrentRoom: (room: Room | null) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  toggleHandRaise: () => void;
  setVirtualBgMode: (mode: BackgroundMode) => void;
  setVirtualBgColor: (color: string) => void;
  setVirtualBgImageUrl: (url: string | null) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>()((set) => ({
  currentRoom: null,
  participants: [],
  localStream: null,
  remoteStreams: new Map(),
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isHandRaised: false,
  virtualBgMode: 'none',
  virtualBgColor: '#1e293b',
  virtualBgImageUrl: null,

  setCurrentRoom: (room) => set({ currentRoom: room }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),

  updateParticipant: (userId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.userId === userId ? { ...p, ...updates } : p
      ),
    })),

  setLocalStream: (stream) => set({ localStream: stream }),

  setRemoteStream: (userId, stream) =>
    set((state) => {
      const newMap = new Map(state.remoteStreams);
      newMap.set(userId, stream);
      return { remoteStreams: newMap };
    }),

  removeRemoteStream: (userId) =>
    set((state) => {
      const newMap = new Map(state.remoteStreams);
      newMap.delete(userId);
      return { remoteStreams: newMap };
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

  toggleScreenShare: () =>
    set((state) => ({ isScreenSharing: !state.isScreenSharing })),

  toggleHandRaise: () =>
    set((state) => ({ isHandRaised: !state.isHandRaised })),

  setVirtualBgMode: (mode) => set({ virtualBgMode: mode }),
  setVirtualBgColor: (color) => set({ virtualBgColor: color }),
  setVirtualBgImageUrl: (url) => set({ virtualBgImageUrl: url }),

  reset: () =>
    set({
      currentRoom: null,
      participants: [],
      localStream: null,
      remoteStreams: new Map(),
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      isHandRaised: false,
      virtualBgMode: 'none',
      virtualBgColor: '#1e293b',
      virtualBgImageUrl: null,
    }),
}));
