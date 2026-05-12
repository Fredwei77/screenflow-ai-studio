// ==================== Core Enums ====================

export enum RecorderState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

export enum Role {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  TA = 'TA',
  STUDENT = 'STUDENT',
}

export enum ParticipantRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  ATTENDEE = 'ATTENDEE',
}

// ==================== Core Interfaces ====================

export interface Question {
  id: string;
  text: string;
  timestamp: number;
  category: 'deep-dive' | 'clarification' | 'creative' | 'support';
}

export interface AnalysisMetric {
  name: string;
  value: number;
  fullMark: number;
}

export type MediaSourceType = 'screen' | 'camera' | 'both';

// ==================== User & Auth ====================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ==================== Meeting / Room ====================

export interface Room {
  id: string;
  meetingId: string;
  name: string;
  hostId: string;
  password?: string;
  isRecording: boolean;
  createdAt: string;
}

export interface Participant {
  userId: string;
  userName: string;
  socketId?: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isHandRaised?: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  roomId: string;
  createdAt: string;
}

// ==================== WebRTC ====================

export interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
}
