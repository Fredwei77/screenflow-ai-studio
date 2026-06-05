import { useRef, useCallback, useEffect } from 'react';
import { Device } from 'mediasoup-client';
import { types as mediasoupClientTypes } from 'mediasoup-client';
import { getSocket } from '../services/socket';
import { useMeetingStore } from '../stores/useMeetingStore';

const logJson = (message: string, data: Record<string, unknown>) => {
  console.log(`${message} ${JSON.stringify(data)}`);
};

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
  const consumedProducerIdsRef = useRef<Set<string>>(new Set());
  const consumingProducerIdsRef = useRef<Set<string>>(new Set());
  const closedProducerIdsRef = useRef<Set<string>>(new Set());
  const socketRequestQueuesRef = useRef<Map<string, Promise<void>>>(new Map());
  const isJoiningRef = useRef(false);

  const { setRemoteStream, removeRemoteStream } = useMeetingStore();

  const getPreferredVideoCodec = useCallback(() => {
    const codecs = deviceRef.current?.rtpCapabilities.codecs || [];
    const userAgent = navigator.userAgent;
    const isSafari = /safari/i.test(userAgent) && !/chrome|chromium|crios|android/i.test(userAgent);
    const preferredMimeType = isSafari ? 'video/H264' : 'video/VP8';

    return (
      codecs.find((codec) => codec.mimeType.toLowerCase() === preferredMimeType.toLowerCase())
      || codecs.find((codec) => codec.kind === 'video')
    );
  }, []);

  // Emit a socket event with response event (non-ack based for SFU signaling)
  const socketRequest = useCallback((event: string, data?: any, responseEvent?: string): Promise<any> => {
    const responseKey = responseEvent || `${event}Response`;
    const previousRequest = socketRequestQueuesRef.current.get(responseKey) || Promise.resolve();
    const request = previousRequest.catch(() => {}).then(() => new Promise<any>((resolve, reject) => {
      const socket = getSocket();
      const handleResponse = (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      };
      const timeout = setTimeout(() => {
        socket.off(responseKey as any, handleResponse);
        reject(new Error(`Timeout waiting for ${responseKey}`));
      }, 10000);

      socket.once(responseKey as any, handleResponse);
      socket.emit(event, data);
    }));
    const queueTail = request.then(() => undefined, () => undefined);

    socketRequestQueuesRef.current.set(responseKey, queueTail);
    queueTail.finally(() => {
      if (socketRequestQueuesRef.current.get(responseKey) === queueTail) {
        socketRequestQueuesRef.current.delete(responseKey);
      }
    });

    return request;
  }, []);

  const requestRemoteKeyFrame = useCallback(async (consumerId: string, reason: string) => {
    try {
      await socketRequest('requestKeyFrame', { consumerId }, 'keyFrameRequested');
      logJson('[WebRTC] Requested remote video keyframe:', { consumerId, reason });
    } catch (error) {
      console.warn('[WebRTC] Failed to request remote video keyframe:', { consumerId, reason, error });
    }
  }, [socketRequest]);

  const logVideoConsumerStats = useCallback(async (
    consumer: mediasoupClientTypes.Consumer,
    label: string
  ): Promise<{ bytesReceived: number; framesDecoded: number }> => {
    let bytesReceived = 0;
    let packetsReceived = 0;
    let framesDecoded = 0;
    let framesReceived = 0;
    let keyFramesDecoded = 0;
    let frameWidth: number | undefined;
    let frameHeight: number | undefined;
    let pliCount: number | undefined;
    let firCount: number | undefined;
    let nackCount: number | undefined;
    let codecMimeType: string | undefined;

    try {
      const report = await consumer.getStats();
      const stats = Array.from(report.values()) as Array<any>;
      const inbound = stats.find((item) => (
        item.type === 'inbound-rtp'
        && !item.isRemote
        && (item.kind === 'video' || item.mediaType === 'video')
      ));

      if (inbound) {
        bytesReceived = inbound.bytesReceived || 0;
        packetsReceived = inbound.packetsReceived || 0;
        framesDecoded = inbound.framesDecoded || 0;
        framesReceived = inbound.framesReceived || 0;
        keyFramesDecoded = inbound.keyFramesDecoded || 0;
        frameWidth = inbound.frameWidth;
        frameHeight = inbound.frameHeight;
        pliCount = inbound.pliCount;
        firCount = inbound.firCount;
        nackCount = inbound.nackCount;

        const codec = stats.find((item) => item.id === inbound.codecId);
        codecMimeType = codec?.mimeType;
      }

      logJson('[WebRTC] Video consumer stats:', {
        label,
        consumerId: consumer.id,
        producerId: consumer.producerId,
        trackMuted: consumer.track.muted,
        trackReadyState: consumer.track.readyState,
        bytesReceived,
        packetsReceived,
        framesReceived,
        framesDecoded,
        keyFramesDecoded,
        frameWidth,
        frameHeight,
        pliCount,
        firCount,
        nackCount,
        codecMimeType,
      });
    } catch (error) {
      console.warn('[WebRTC] Failed to read video consumer stats:', { label, consumerId: consumer.id, error });
    }

    return { bytesReceived, framesDecoded };
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

    if (
      closedProducerIdsRef.current.has(producerId)
      || consumedProducerIdsRef.current.has(producerId)
      || consumingProducerIdsRef.current.has(producerId)
    ) {
      return;
    }

    consumingProducerIdsRef.current.add(producerId);
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
      consumedProducerIdsRef.current.add(producerId);

      // Resume the consumer on the server
      await socketRequest('resumeConsumer', { consumerId: consumer.id }, 'consumerResumed');
      if (consumer.paused) {
        consumer.resume();
      }

      // Attach the track to the remote stream for this peer
      const track = consumer.track;
      const userId = peer.userId;
      logJson('[WebRTC] Remote track attached:', {
        producerId,
        consumerId: consumer.id,
        kind: track.kind,
        muted: track.muted,
        readyState: track.readyState,
        settings: typeof track.getSettings === 'function' ? track.getSettings() : undefined,
      });

      if (track.kind === 'video') {
        track.addEventListener('unmute', () => {
          logJson('[WebRTC] Remote video track unmuted:', {
            producerId,
            consumerId: consumer.id,
            readyState: track.readyState,
            settings: typeof track.getSettings === 'function' ? track.getSettings() : undefined,
          });
        }, { once: true });

        requestRemoteKeyFrame(consumer.id, 'after-video-track-attached');
        [1500, 4000, 8000].forEach((delay) => {
          window.setTimeout(async () => {
            if (consumer.closed) return;
            const stats = await logVideoConsumerStats(consumer, `${delay}ms-after-attach`);
            if (track.readyState === 'live' && stats.framesDecoded === 0) {
              requestRemoteKeyFrame(consumer.id, `no-decoded-frame-after-${delay}ms`);
            }
          }, delay);
        });
      }

      // Build a fresh MediaStream object every time. Mutating the existing
      // MediaStream in place does not always retrigger React video binding,
      // especially when audio arrives before video on desktop browsers.
      const existingStream = useMeetingStore.getState().remoteStreams.get(userId);
      const nextStream = new MediaStream(
        existingStream
          ? existingStream.getTracks().filter((existingTrack) => (
              existingTrack.readyState === 'live'
              && !(existingTrack.kind === track.kind && existingTrack.id === track.id)
            ))
          : []
      );
      nextStream.addTrack(track);
      setRemoteStream(userId, nextStream);

      // When the track ends, remove it from the stream
      track.onended = () => {
        const latestStream = useMeetingStore.getState().remoteStreams.get(userId);
        if (!latestStream) return;
        const remainingTracks = latestStream.getTracks().filter((item) => item.id !== track.id && item.readyState === 'live');
        if (remainingTracks.length === 0) {
          removeRemoteStream(userId);
        } else {
          setRemoteStream(userId, new MediaStream(remainingTracks));
        }
        consumersRef.current.delete(consumer.id);
        consumedProducerIdsRef.current.delete(producerId);
      };

      console.log(`[WebRTC] Consumed producer ${producerId} (${kind}) from ${peer.userName}`);
    } catch (err) {
      console.error('[WebRTC] Failed to consume producer:', producerId, err);
    } finally {
      consumingProducerIdsRef.current.delete(producerId);
    }
  }, [socketRequest, setRemoteStream, removeRemoteStream, requestRemoteKeyFrame, logVideoConsumerStats]);

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
      closedProducerIdsRef.current.delete(producerId);
      consumeProducer(producerId, kind, peer);
    });

    // --- Listen for producer close notifications ---
    socket.on('producerClosed', ({ producerId }: { producerId: string }) => {
      console.log('[WebRTC] Producer closed:', producerId);
      closedProducerIdsRef.current.add(producerId);
      consumedProducerIdsRef.current.delete(producerId);
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

      const preferredCodec = getPreferredVideoCodec();
      logJson('[WebRTC] Producing video:', {
        codec: preferredCodec?.mimeType || 'browser default',
        trackSettings: typeof videoTrack.getSettings === 'function' ? videoTrack.getSettings() : undefined,
      });

      const videoProducer = await sendTransport.produce({
        track: videoTrack,
        codec: preferredCodec,
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
  }, [getPreferredVideoCodec]);

  // Replace video track (for screen sharing or virtual background)
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    if (newTrack.readyState !== 'live') {
      console.warn('[WebRTC] Skip replacing video track because track is not live:', newTrack.readyState);
      return false;
    }

    const videoProducer = producersRef.current.get('video');
    if (videoProducer && !videoProducer.closed) {
      try {
        await videoProducer.replaceTrack({ track: newTrack });
        console.log('[WebRTC] Video track replaced on producer');
        return true;
      } catch (error) {
        console.warn('[WebRTC] Failed to replace video track:', error);
        return false;
      }
    }
    return false;
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
    consumedProducerIdsRef.current.clear();
    consumingProducerIdsRef.current.clear();
    closedProducerIdsRef.current.clear();
    socketRequestQueuesRef.current.clear();

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
