import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/useAuthStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;
    socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
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
