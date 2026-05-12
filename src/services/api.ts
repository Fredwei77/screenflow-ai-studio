import { useAuthStore } from '../stores/useAuthStore';

const API_BASE = '/api';

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
  generateQuestion: (context: string, tone: string) =>
    request<any>('/ai/questions', {
      method: 'POST',
      body: JSON.stringify({ context, tone }),
    }),
  analyzePerformance: (transcript: string) =>
    request<any>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    }),
};
