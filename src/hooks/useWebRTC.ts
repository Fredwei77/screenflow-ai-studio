import { useRef, useCallback, useEffect } from 'react';
import { Device } from 'mediasoup-client';
import { types as mediasoupClientTypes } from 'mediasoup-client';
import { getSocket } from '../services/socket';
import { useMeetingStore } from '../stores/useMeetingStore';

/**
 * SFU-based WebRTC hook using mediasoup-client.
 *
 * Each client maintains exactly 2 transports (send + recv) to the server,
 * instead of N peer connections in the old mesh topology.
 *
 * Flow:
 * 1. Load Device with router RTP capabilities
 * 2. Create send transport → produce local audio/video
 * 3. Create recv transport → consume remote producers
 * 4. When newProducer event arrives → auto-consume
 */
export function useWebRTC(localStream: MediaStream | null) {
  const deviceRef = useRef<mediasoupClientTypes.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClientTypes.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClientTypes.Transport | null>(null);
  const producersRef = useRef<Map<string, mediasoupClientTypes.Producer>>(new Map()); // kind -> producer
  const consumersRef = useRef<Map<string, mediasoupClientTypes.Consumer>>(new Map()); // consumerId -> consumer
  const pendingConsumeRef = useRef<Array<{ producerId: string; kind: string; peer: any }>>([]);
  const isJoiningRef = useRef(false);

  const { setRemoteStream, removeRemoteStream } = useMeetingStore();

  // Emit a socket event with response event (non-ack based for SFU signaling)
  const socketRequest = useCallback((event: string, data?: any, responseEvent?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      const responseKey = responseEvent || `${event}Response`;

      const timeout = setTimeout(() => {
        socket.off(responseKey as any);
        reject(new Error(`Timeout waiting for ${responseKey}`));
      }, 10000);

      socket.once(responseKey as any, (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      socket.emit(event, data);
    });
  }, []);

  // Consume a single remote producer
  const consumeProducer = useCallback(async (
    producerId: string,
    kind: string,
    peer: { userId: string; userName: string; socketId: string }
  ) => {
    const recvTransport = recvTransportRef.current;
    const device = deviceRef.current;
    if (!recvTransport || !device) {
      console.warn('[WebRTC] Cannot consume — no recv transport or device');
      return;
    }

    try {
      console.log('[WebRTC] Requesting consume for producer:', producerId, 'kind:', kind);
      const result = await socketRequest('consume', {
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      }, 'consumed');

      console.log('[WebRTC] Consume response received, creating consumer');

      if (!result.rtpParameters) {
        console.error('[WebRTC] No rtpParameters in consume response!');
        return;
      }

      const consumer = await recvTransport.consume({
        id: result.consumerId,
        producerId: result.producerId,
        kind: result.kind,
        rtpParameters: result.rtpParameters,
      });

      console.log('[WebRTC] Consumer created:', consumer.id, 'track ready:', consumer.track ? 'yes' : 'no');

      consumersRef.current.set(consumer.id, consumer);

      // Resume the consumer on the server
      await socketRequest('resumeConsumer', { consumerId: consumer.id }, 'consumerResumed');

      // Attach the track to the remote stream for this peer
      const track = consumer.track;
      // Use socketId as key since it's unique per connection
      // peer.userId may not match the participant's actual userId
      const userId = peer.socketId;

      // Get or create a MediaStream for this peer
      let remoteStream = useMeetingStore.getState().remoteStreams.get(userId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
      }
      remoteStream.addTrack(track);
      setRemoteStream(userId, remoteStream);

      // When the track ends, remove it from the stream
      track.onended = () => {
        remoteStream!.removeTrack(track);
        if (remoteStream!.getTracks().length === 0) {
          removeRemoteStream(userId);
        }
        consumersRef.current.delete(consumer.id);
      };

      console.log(`[WebRTC] Consumed producer ${producerId} (${kind}) from ${peer.userName}`);
    } catch (err) {
      console.error('[WebRTC] Failed to consume producer:', producerId, err);
    }
  }, [socketRequest, setRemoteStream, removeRemoteStream]);

  // Initialize the mediasoup Device and transports
  const initDevice = useCallback(async () => {
    if (deviceRef.current) return; // Already initialized

    const socket = getSocket();
    const device = new Device();
    deviceRef.current = device;

    try {
    // Get router RTP capabilities from server
    const { rtpCapabilities } = await socketRequest('getRouterRtpCapabilities', undefined, 'rtpCapabilitiesResponse');
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    console.log('[WebRTC] Device loaded with RTP capabilities');

    // --- Create send transport ---
    const sendParams = await socketRequest('createWebRtcTransport', { direction: 'send' }, 'sendTransportCreated');
    const sendTransport = device.createSendTransport({
      id: sendParams.id,
      iceParameters: sendParams.iceParameters,
      iceCandidates: sendParams.iceCandidates,
      dtlsParameters: sendParams.dtlsParameters,
    });

    sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socketRequest('connectTransport', {
        transportId: sendTransport.id,
        dtlsParameters,
      }, 'transportConnected').then(() => {
        callback();
      }).catch(errback);
    });

    sendTransport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
      socketRequest('produce', {
        transportId: sendTransport.id,
        kind,
        rtpParameters,
      }, 'produced').then(({ producerId }) => {
        callback({ id: producerId });
      }).catch(errback);
    });

    sendTransportRef.current = sendTransport;
    console.log('[WebRTC] Send transport created');

    // --- Create recv transport ---
    const recvParams = await socketRequest('createWebRtcTransport', { direction: 'recv' }, 'recvTransportCreated');
    const recvTransport = device.createRecvTransport({
      id: recvParams.id,
      iceParameters: recvParams.iceParameters,
      iceCandidates: recvParams.iceCandidates,
      dtlsParameters: recvParams.dtlsParameters,
    });

    recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socketRequest('connectTransport', {
        transportId: recvTransport.id,
        dtlsParameters,
      }, 'transportConnected').then(() => {
        callback();
      }).catch(errback);
    });

    recvTransportRef.current = recvTransport;
    console.log('[WebRTC] Recv transport created');

    // --- Listen for new producers from other peers ---
    socket.on('newProducer', ({ producerId, kind, peer }: { producerId: string; kind: string; peer: any }) => {
      console.log('[WebRTC] New producer notification:', producerId, kind, 'from', peer.userName);
      consumeProducer(producerId, kind, peer);
    });

    // --- Listen for producer close notifications ---
    socket.on('producerClosed', ({ producerId }: { producerId: string }) => {
      console.log('[WebRTC] Producer closed:', producerId);
      // Find and close the consumer for this producer
      for (const [consumerId, consumer] of consumersRef.current) {
        if (consumer.producerId === producerId) {
          consumer.close();
          consumersRef.current.delete(consumerId);
          break;
        }
      }
    });

    // --- Consume existing producers (from peers who joined before us) ---
    const { producers: existingProducers } = await socketRequest('getExistingProducers', undefined, 'producersList');
    console.log('[WebRTC] Existing producers:', existingProducers.length);
    for (const { producerId, kind, peer } of existingProducers) {
      await consumeProducer(producerId, kind, peer);
    }
    } catch (err) {
      // Clean up any partially-created transports
      if (sendTransportRef.current) {
        sendTransportRef.current.close();
        sendTransportRef.current = null;
      }
      if (recvTransportRef.current) {
        recvTransportRef.current.close();
        recvTransportRef.current = null;
      }
      // Remove socket listeners that may have been registered
      socket.off('newProducer');
      socket.off('producerClosed');
      // Clear device ref so retries can re-initialize
      deviceRef.current = null;
      throw err;
    }
  }, [socketRequest, consumeProducer]);

  // Produce local media (audio + video)
  const produceLocalMedia = useCallback(async (stream: MediaStream) => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) {
      console.warn('[WebRTC] Cannot produce — no send transport');
      return;
    }

    // Produce video
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      // Close existing video producer if any
      const existingVideo = producersRef.current.get('video');
      if (existingVideo && !existingVideo.closed) {
        existingVideo.close();
        producersRef.current.delete('video');
      }

      const videoProducer = await sendTransport.produce({
        track: videoTrack,
        encodings: [
          { maxBitrate: 100000 },  // Low quality
          { maxBitrate: 300000 },  // Medium quality
          { maxBitrate: 900000 },  // High quality
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });
      producersRef.current.set('video', videoProducer);
      console.log('[WebRTC] Video producer created:', videoProducer.id);
    }

    // Produce audio
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      // Close existing audio producer if any
      const existingAudio = producersRef.current.get('audio');
      if (existingAudio && !existingAudio.closed) {
        existingAudio.close();
        producersRef.current.delete('audio');
      }

      const audioProducer = await sendTransport.produce({
        track: audioTrack,
      });
      producersRef.current.set('audio', audioProducer);
      console.log('[WebRTC] Audio producer created:', audioProducer.id);
    }
  }, []);

  // Replace video track (for screen sharing or virtual background)
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    const videoProducer = producersRef.current.get('video');
    if (videoProducer && !videoProducer.closed) {
      await videoProducer.replaceTrack({ track: newTrack });
      console.log('[WebRTC] Video track replaced on producer');
    }
  }, []);

  // Toggle mute (pause/resume audio producer)
  const toggleMute = useCallback((muted: boolean) => {
    const audioProducer = producersRef.current.get('audio');
    if (!audioProducer || audioProducer.closed) return;

    if (muted) {
      audioProducer.pause();
      getSocket().emit('pauseProducer', { producerId: audioProducer.id });
    } else {
      audioProducer.resume();
      getSocket().emit('resumeProducer', { producerId: audioProducer.id });
    }
  }, []);

  // Toggle camera (pause/resume video producer)
  const toggleCamera = useCallback((cameraOff: boolean) => {
    const videoProducer = producersRef.current.get('video');
    if (!videoProducer || videoProducer.closed) return;

    if (cameraOff) {
      videoProducer.pause();
      getSocket().emit('pauseProducer', { producerId: videoProducer.id });
    } else {
      videoProducer.resume();
      getSocket().emit('resumeProducer', { producerId: videoProducer.id });
    }
  }, []);

  // Join room and set up SFU
  const joinRoom = useCallback(async (meetingId: string, userName: string) => {
    if (isJoiningRef.current) return;
    isJoiningRef.current = true;

    try {
      // First, join the room via socket (existing logic)
      const socket = getSocket();
      socket.emit('join-room', { meetingId, userName });

      // Wait for room-joined response
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for room-joined')), 10000);
        socket.once('room-joined', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // Initialize mediasoup device and transports
      // Retry up to 3 times in case of "Not in a room" race condition
      let initError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await initDevice();
          initError = null;
          break;
        } catch (err: any) {
          initError = err;
          if (err.message === 'Not in a room' && attempt < 2) {
            console.warn(`[WebRTC] SFU not ready yet, retrying (${attempt + 1}/3)...`);
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
      if (initError) throw initError;

      // Start producing local media
      if (localStream) {
        await produceLocalMedia(localStream);
      }

      console.log('[WebRTC] Successfully joined room and started producing');
    } catch (err) {
      console.error('[WebRTC] Failed to join room:', err);
    } finally {
      isJoiningRef.current = false;
    }
  }, [localStream, initDevice, produceLocalMedia]);

  // Clean up all resources
  const cleanupAll = useCallback(() => {
    // Close all producers
    for (const producer of producersRef.current.values()) {
      if (!producer.closed) producer.close();
    }
    producersRef.current.clear();

    // Close all consumers
    for (const consumer of consumersRef.current.values()) {
      if (!consumer.closed) consumer.close();
    }
    consumersRef.current.clear();

    // Close transports
    if (sendTransportRef.current && !sendTransportRef.current.closed) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
    if (recvTransportRef.current && !recvTransportRef.current.closed) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }

    // Reset device
    deviceRef.current = null;

    // Remove socket listeners
    const socket = getSocket();
    socket.off('newProducer');
    socket.off('producerClosed');

    console.log('[WebRTC] All resources cleaned up');
  }, []);

  // When localStream changes, produce it (if transport is ready)
  useEffect(() => {
    if (localStream && sendTransportRef.current && !sendTransportRef.current.closed) {
      produceLocalMedia(localStream);
    }
  }, [localStream, produceLocalMedia]);

  return {
    joinRoom,
    cleanupAll,
    replaceVideoTrack,
    toggleMute,
    toggleCamera,
  };
}
