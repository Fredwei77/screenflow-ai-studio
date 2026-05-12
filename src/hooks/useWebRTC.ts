import { useRef, useCallback, useEffect } from 'react';
import { getSocket, sendOffer, sendAnswer, sendIceCandidate } from '../services/socket';
import { useMeetingStore } from '../stores/useMeetingStore';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(localStream: MediaStream | null) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const { setRemoteStream, removeRemoteStream } = useMeetingStore();

  const createPeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(remoteUserId, event.streams[0]);
        }
      };

      // Send ICE candidates to remote peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(remoteUserId, event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanupPeer(remoteUserId);
        }
      };

      peersRef.current.set(remoteUserId, pc);
      return pc;
    },
    [localStream, setRemoteStream]
  );

  const cleanupPeer = useCallback(
    (userId: string) => {
      const pc = peersRef.current.get(userId);
      if (pc) {
        pc.close();
        peersRef.current.delete(userId);
      }
      removeRemoteStream(userId);
    },
    [removeRemoteStream]
  );

  const cleanupAll = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
  }, []);

  // Create and send offer to a new peer
  const createOffer = useCallback(
    async (remoteUserId: string) => {
      const pc = createPeerConnection(remoteUserId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendOffer(remoteUserId, offer);
      } catch (e) {
        console.error('Failed to create offer:', e);
      }
    },
    [createPeerConnection]
  );

  // Handle incoming offer
  const handleOffer = useCallback(
    async (from: string, offer: RTCSessionDescriptionInit) => {
      let pc = peersRef.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendAnswer(from, answer);
      } catch (e) {
        console.error('Failed to handle offer:', e);
      }
    },
    [createPeerConnection]
  );

  // Handle incoming answer
  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    const pc = peersRef.current.get(from);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error('Failed to handle answer:', e);
      }
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peersRef.current.get(from);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Failed to add ICE candidate:', e);
      }
    }
  }, []);

  // Listen for signaling events
  useEffect(() => {
    const socket = getSocket();

    const handleSignal = async (message: { type: string; from: string; data: any }) => {
      switch (message.type) {
        case 'offer':
          await handleOffer(message.from, message.data);
          break;
        case 'answer':
          await handleAnswer(message.from, message.data);
          break;
        case 'ice-candidate':
          await handleIceCandidate(message.from, message.data);
          break;
      }
    };

    const handleUserJoined = ({ userId }: { userId: string }) => {
      // Initiator creates offer to the new user
      createOffer(userId);
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      cleanupPeer(userId);
    };

    socket.on('signal', handleSignal);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('signal', handleSignal);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [handleOffer, handleAnswer, handleIceCandidate, createOffer, cleanupPeer]);

  // Replace video track (for screen sharing)
  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }, []);

  return { createOffer, cleanupAll, replaceVideoTrack };
}
