import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io({
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Room events
export function joinRoom(meetingId: string, userName?: string) {
  getSocket().emit('join-room', { meetingId, userName });
}

export function leaveRoom(meetingId: string) {
  getSocket().emit('leave-room', { meetingId });
}

// Signaling events
export function sendOffer(to: string, offer: RTCSessionDescriptionInit) {
  getSocket().emit('signal', { type: 'offer', to, data: offer });
}

export function sendAnswer(to: string, answer: RTCSessionDescriptionInit) {
  getSocket().emit('signal', { type: 'answer', to, data: answer });
}

export function sendIceCandidate(to: string, candidate: RTCIceCandidateInit) {
  getSocket().emit('signal', { type: 'ice-candidate', to, data: candidate });
}

// Chat events
export function sendMessage(roomId: string, content: string) {
  getSocket().emit('chat:message', { roomId, content });
}

// Media state events
export function sendMediaState(meetingId: string, state: { isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }) {
  getSocket().emit('media:state', { meetingId, ...state });
}

// Subtitle events
export function sendSubtitle(meetingId: string, subtitle: { text: string; isFinal: boolean }) {
  getSocket().emit('subtitle', { meetingId, ...subtitle });
}

// Whiteboard events
export function sendWhiteboardStroke(meetingId: string, stroke: any) {
  getSocket().emit('whiteboard:stroke', { meetingId, stroke });
}

export function sendWhiteboardClear(meetingId: string) {
  getSocket().emit('whiteboard:clear', { meetingId });
}

// Poll events
export function sendPollCreated(meetingId: string, poll: any) {
  getSocket().emit('poll:created', { meetingId, poll });
}

export function sendPollVote(meetingId: string, data: { pollId: string; userId: string; userName: string; optionIdx: number }) {
  getSocket().emit('poll:vote', { meetingId, ...data });
}
