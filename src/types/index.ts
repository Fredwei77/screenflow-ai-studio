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

export type LayoutMode = 'camera-only' | 'screen-only' | 'pip' | 'side-by-side' | 'floating-camera';

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
  role?: string;
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

// ==================== Whiteboard ====================

export type DrawTool = 'pen' | 'eraser' | 'rect' | 'circle' | 'line' | 'text';

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawTool;
  color: string;
  lineWidth: number;
  points: DrawPoint[];
  userId: string;
  userName: string;
}

// ==================== Polls ====================

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PollWithVotes extends Poll {
  votes: Vote[];
  totalVotes: number;
}

export interface Vote {
  id: string;
  pollId: string;
  userId: string;
  userName: string;
  optionIdx: number;
}

// ==================== Subtitles ====================

export interface SubtitleEntry {
  id: string;
  text: string;
  userId: string;
  userName: string;
  isFinal: boolean;
  timestamp: number;
}

// ==================== Summary ====================

export interface MeetingSummaryData {
  id: string;
  content: string;
  transcript: string;
  createdAt: string;
}

export interface SummaryContent {
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
}

// ==================== Recording Metadata ====================

export interface RecordingMeta {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  fileName: string;
  fileSize: number;
  duration: number;
  mimeType: string;
  storagePath?: string;
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
