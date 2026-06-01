import { create } from 'zustand';
import type { PollWithVotes, Vote } from '../types';

interface PollState {
  polls: PollWithVotes[];
  activePoll: PollWithVotes | null;
  isPollPanelOpen: boolean;

  setPolls: (polls: PollWithVotes[]) => void;
  addPoll: (poll: PollWithVotes) => void;
  updatePoll: (pollId: string, updates: Partial<PollWithVotes>) => void;
  setActivePoll: (poll: PollWithVotes | null) => void;
  addVote: (pollId: string, vote: Vote) => void;
  togglePollPanel: () => void;
  reset: () => void;
}

export const usePollStore = create<PollState>()((set) => ({
  polls: [],
  activePoll: null,
  isPollPanelOpen: false,

  setPolls: (polls) => set((state) => {
    const byId = new Map(polls.map((poll) => [poll.id, poll]));
    state.polls.forEach((poll) => {
      if (!byId.has(poll.id)) byId.set(poll.id, poll);
    });
    return { polls: Array.from(byId.values()) };
  }),
  addPoll: (poll) => set((state) => {
    // Deduplicate: skip if poll with same id already exists
    if (state.polls.some((p) => p.id === poll.id)) return state;
    return { polls: [...state.polls, poll], activePoll: poll };
  }),
  updatePoll: (pollId, updates) => set((state) => ({
    polls: state.polls.map((p) => p.id === pollId ? { ...p, ...updates } : p),
    activePoll: state.activePoll?.id === pollId ? { ...state.activePoll, ...updates } : state.activePoll,
  })),
  setActivePoll: (activePoll) => set({ activePoll }),
  addVote: (pollId, vote) => set((state) => {
    const poll = state.polls.find((p) => p.id === pollId);
    if (!poll) return state;
    // Deduplicate: skip if this user already voted
    if (poll.votes.some((v) => v.userId === vote.userId)) return state;
    const updatedPoll = {
      ...poll,
      votes: [...poll.votes, vote],
      totalVotes: poll.totalVotes + 1,
    };
    return {
      polls: state.polls.map((p) => p.id === pollId ? updatedPoll : p),
      activePoll: state.activePoll?.id === pollId ? updatedPoll : state.activePoll,
    };
  }),
  togglePollPanel: () => set((state) => ({ isPollPanelOpen: !state.isPollPanelOpen })),
  reset: () => set({ polls: [], activePoll: null, isPollPanelOpen: false }),
}));
