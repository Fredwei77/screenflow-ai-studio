import { create } from 'zustand';
import type { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((item) => item.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),

  setMessages: (messages) =>
    set((state) => {
      const byId = new Map(state.messages.map((message) => [message.id, message]));
      messages.forEach((message) => byId.set(message.id, message));
      return {
        messages: Array.from(byId.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      };
    }),

  clearMessages: () => set({ messages: [] }),
}));
