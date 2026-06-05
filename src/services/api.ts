import { useAuthStore } from '../stores/useAuthStore';
import type { ChatMessage, PollWithVotes, Vote } from '../types';

const API_BASE = '/meet/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
};

// Rooms
export const roomsApi = {
  create: (name: string, password?: string) =>
    request<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  join: (meetingId: string, password?: string) =>
    request<any>(`/rooms/${meetingId}/join`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  get: (meetingId: string) => request<any>(`/rooms/${meetingId}`),
};

// AI
export const aiApi = {
  generateQuestion: (context: string, tone: string, language: 'zh-CN' | 'en-US' = 'en-US') =>
    request<any>('/ai/questions', {
      method: 'POST',
      body: JSON.stringify({ context, tone, language }),
    }),
  analyzePerformance: (transcript: string) =>
    request<any>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    }),
  generateSummary: (transcript: string) =>
    request<{ keyPoints: string[]; actionItems: string[]; questions: string[] }>('/ai/summary', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    }),
};

// Polls
export const pollApi = {
  getPolls: (meetingId: string) =>
    request<PollWithVotes[]>(`/polls/${meetingId}`),
  createPoll: (meetingId: string, question: string, options: string[], createdBy: string) =>
    request<PollWithVotes>(`/polls/${meetingId}`, {
      method: 'POST',
      body: JSON.stringify({ question, options, createdBy }),
    }),
  vote: (pollId: string, userId: string, userName: string, optionIdx: number) =>
    request<Vote>(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ userId, userName, optionIdx }),
    }),
  closePoll: (pollId: string) =>
    request<any>(`/polls/${pollId}/close`, { method: 'PATCH' }),
};

// Chat
export const chatApi = {
  getMessages: (meetingId: string) =>
    request<ChatMessage[]>(`/chat/${meetingId}`),
};

// Recordings
export const recordingApi = {
  getRecordings: (meetingId: string) =>
    request<any[]>(`/recordings/${meetingId}`),
  saveRecording: (meetingId: string, data: { userId: string; userName: string; fileName: string; fileSize: number; duration: number; mimeType: string }) =>
    request<any>(`/recordings/${meetingId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteRecording: (id: string) =>
    request<any>(`/recordings/${id}`, { method: 'DELETE' }),
};
