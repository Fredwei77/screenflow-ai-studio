import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { serverConfig } from '../config.js';
import { Room, PeerInfo } from '../sfu/Room.js';
import { createWorker } from '../sfu/mediasoupServer.js';
import { types as mediasoupTypes } from 'mediasoup';

// In-memory room state: meetingId -> Map<socketId, { userId, userName, role, mediaState }>
const rooms = new Map<string, Map<string, { userId: string; userName: string; role: string; isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }>>();

// SFU rooms: meetingId -> Room
const sfuRooms = new Map<string, Room>();

// In-memory whiteboard strokes per room
const whiteboardStrokes = new Map<string, any[]>();

// Track which SFU room each socket belongs to (for disconnect cleanup)
const socketToSfuRoom = new Map<string, { meetingId: string; room: Room }>();

let workerInitialized = false;

/**
 * Initialize the mediasoup worker. Must be called once before accepting connections.
 */
export async function initSfuWorker(): Promise<void> {
  if (workerInitialized) return;
  try {
    await createWorker();
    workerInitialized = true;
    console.log('[SFU] Worker initialized successfully');
  } catch (error) {
    console.error('[SFU] Failed to initialize worker:', error);
    // SFU is optional — the app can still work without it (degraded mode)
  }
}

/**
 * Get or create an SFU Room, setting up notification handlers for socket.io events.
 */
async function getSfuRoom(meetingId: string, io: Server): Promise<Room> {
  let room = sfuRooms.get(meetingId);
  if (room) return room;

  room = await Room.create(meetingId);

  // Set up notification handlers so the Room can emit socket.io events
  room.setNotificationHandlers({
    onNewProducer: (targetSocketId: string, producerId: string, kind: string, peer: PeerInfo) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('newProducer', { producerId, kind, peer });
      }
    },
    onProducerClosed: (targetSocketId: string, producerId: string) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('producerClosed', { producerId });
      }
    },
    onConsumerClosed: (targetSocketId: string, consumerId: string, producerId: string) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('consumerClosed', { consumerId, producerId });
      }
    },
  });

  sfuRooms.set(meetingId, room);
  return room;
}

export function setupSocketHandlers(io: Server) {
  // Initialize SFU worker on first connection (if not already done)
  if (!workerInitialized) {
    initSfuWorker().catch((err) => console.error('[SFU] Init failed:', err));
  }

  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let currentUserId: string = socket.id;
    let currentUserName: string = 'Anonymous';
    let currentRole: string = 'STUDENT';

    // Try to extract userId from JWT auth token and look up role
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, serverConfig.jwtSecret) as { userId: string };
        currentUserId = decoded.userId;
        // Look up user role from DB
        prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } })
          .then((user) => {
            currentRole = user?.role || 'STUDENT';
          })
          .catch(() => { /* keep default */ });
      }
    } catch {
      // Token invalid or missing — fall back to socket.id
    }

    // ============================================================
    // Room join (preserved from original + SFU integration)
    // ============================================================
    socket.on('join-room', async ({ meetingId, userName }: { meetingId: string; userName?: string }) => {
      currentUserName = userName || 'Anonymous';
      currentRoom = meetingId;

      // Create room in memory if not exists
      if (!rooms.has(meetingId)) {
        rooms.set(meetingId, new Map());
      }
      const roomMembers = rooms.get(meetingId)!;

      // Check max participants
      if (roomMembers.size >= serverConfig.maxParticipants) {
        socket.emit('room-full', { meetingId });
        return;
      }

      // Add to room
      roomMembers.set(socket.id, { userId: currentUserId, userName: currentUserName, role: currentRole });
      socket.join(meetingId);

      // Notify existing members about new user
      socket.to(meetingId).emit('user-joined', {
        userId: currentUserId,
        userName: currentUserName,
        socketId: socket.id,
        isLocal: false,
      });
      console.log('[Socket] user-joined emitted to room', meetingId, 'for', currentUserName, '(userId=', currentUserId, '), socketId=', socket.id);

      // Send room state to the new user
      const participants = Array.from(roomMembers.entries())
        .filter(([id]) => id !== socket.id)
        .map(([, data]) => ({ userId: data.userId, userName: data.userName, role: data.role }));

      socket.emit('room-joined', {
        userId: currentUserId,
        participants,
      });

      console.log('[Socket] room-joined sent to', currentUserName, 'with participants:', participants);

      // Broadcast updated participant list
      io.to(meetingId).emit('participants-update', {
        participants: Array.from(roomMembers.values()),
      });

      // Ensure room exists in DB
      try {
        await prisma.room.upsert({
          where: { meetingId },
          create: { meetingId, name: `Meeting ${meetingId}`, hostId: currentUserId },
          update: {},
        });
      } catch (e) {
        console.error('Failed to upsert room in DB:', e);
      }

      console.log(`${currentUserName} joined room ${meetingId} (${roomMembers.size} total)`);

      // Send existing whiteboard strokes to new participant
      const existingStrokes = whiteboardStrokes.get(meetingId) || [];
      if (existingStrokes.length > 0) {
        socket.emit('whiteboard:load', existingStrokes);
      }

      // --- SFU: Add peer to SFU room ---
      if (workerInitialized) {
        try {
          const sfuRoom = await getSfuRoom(meetingId, io);
          sfuRoom.addPeer({
            userId: currentUserId,
            userName: currentUserName,
            socketId: socket.id,
          });
          socketToSfuRoom.set(socket.id, { meetingId, room: sfuRoom });
        } catch (err) {
          console.error('[SFU] Failed to add peer to SFU room:', err);
        }
      }
    });

    // ============================================================
    // SFU Signaling Events (replace old mesh signal relay)
    // ============================================================

    // Client requests router RTP capabilities (needed to create mediasoup Device)
    socket.on('getRouterRtpCapabilities', () => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('rtpCapabilitiesResponse', { error: 'Not in a room' });
        return;
      }
      socket.emit('rtpCapabilitiesResponse', { rtpCapabilities: entry.room.router.rtpCapabilities });
    });

    // Client requests to create a WebRTC transport (send or recv)
    socket.on('createWebRtcTransport', async ({ direction }: { direction: 'send' | 'recv' }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit(direction === 'send' ? 'sendTransportCreated' : 'recvTransportCreated', { error: 'Not in a room' });
        return;
      }
      try {
        const transport = await entry.room.createWebRtcTransport(socket.id, direction);
        socket.emit(direction === 'send' ? 'sendTransportCreated' : 'recvTransportCreated', {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err: any) {
        console.error('[SFU] createWebRtcTransport error:', err);
        socket.emit(direction === 'send' ? 'sendTransportCreated' : 'recvTransportCreated', { error: err.message });
      }
    });

    // Client completes DTLS handshake on a transport
    socket.on('connectTransport', async ({ transportId, dtlsParameters }: { transportId: string; dtlsParameters: mediasoupTypes.DtlsParameters }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('transportConnected', { error: 'Not in a room' });
        return;
      }
      try {
        await entry.room.connectTransport(socket.id, transportId, dtlsParameters);
        socket.emit('transportConnected', { connected: true });
      } catch (err: any) {
        console.error('[SFU] connectTransport error:', err);
        socket.emit('transportConnected', { error: err.message });
      }
    });

    // Client starts producing media (audio or video)
    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }: {
      transportId: string;
      kind: mediasoupTypes.MediaKind;
      rtpParameters: mediasoupTypes.RtpParameters;
      appData?: Record<string, unknown>;
    }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('produced', { error: 'Not in a room' });
        return;
      }
      try {
        const result = await entry.room.produce(socket.id, transportId, kind, rtpParameters, appData || {});
        socket.emit('produced', { producerId: result.producerId });
      } catch (err: any) {
        console.error('[SFU] produce error:', err);
        socket.emit('produced', { error: err.message });
      }
    });

    // Client requests to consume a remote producer
    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }: {
      transportId: string;
      producerId: string;
      rtpCapabilities: mediasoupTypes.RtpCapabilities;
    }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('consumed', { error: 'Not in a room' });
        return;
      }
      try {
        const result = await entry.room.consume(socket.id, transportId, producerId, rtpCapabilities);
        if (!result) {
          socket.emit('consumed', { error: 'Cannot consume — incompatible RTP capabilities' });
          return;
        }
        socket.emit('consumed', {
          consumerId: result.consumerId,
          producerId: result.producerId,
          kind: result.kind,
          rtpParameters: result.rtpParameters,
          peer: result.peer,
        });
      } catch (err: any) {
        console.error('[SFU] consume error:', err);
        socket.emit('consumed', { error: err.message });
      }
    });

    // Client resumes a paused consumer
    socket.on('resumeConsumer', async ({ consumerId }: { consumerId: string }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('consumerResumed', { error: 'Not in a room' });
        return;
      }
      try {
        await entry.room.resumeConsumer(socket.id, consumerId);
        socket.emit('consumerResumed', { resumed: true });
      } catch (err: any) {
        console.error('[SFU] resumeConsumer error:', err);
        socket.emit('consumerResumed', { error: err.message });
      }
    });

    // Client pauses a producer (e.g., mute mic/camera)
    socket.on('pauseProducer', ({ producerId }: { producerId: string }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) return;
      entry.room.pauseProducer(socket.id, producerId);
    });

    // Client resumes a paused producer
    socket.on('resumeProducer', ({ producerId }: { producerId: string }) => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) return;
      entry.room.resumeProducer(socket.id, producerId);
    });

    // Client requests existing producers (for when they first join)
    socket.on('getExistingProducers', () => {
      const entry = socketToSfuRoom.get(socket.id);
      if (!entry) {
        socket.emit('producersList', { error: 'Not in a room' });
        return;
      }
      const producers = entry.room.getExistingProducers();
      socket.emit('producersList', { producers });
    });

    // ============================================================
    // Chat message (preserved)
    // ============================================================
    socket.on('chat:message', async ({ roomId, content }: { roomId: string; content: string }) => {
      if (roomId !== currentRoom) return;
      if (!content || typeof content !== 'string' || content.length > 2000) return;
      const message = {
        id: crypto.randomUUID(),
        content,
        userId: currentUserId,
        userName: currentUserName,
        roomId,
        createdAt: new Date().toISOString(),
      };

      io.to(roomId).emit('chat:message', message);

      try {
        const room = await prisma.room.findUnique({ where: { meetingId: roomId } });
        if (room) {
          await prisma.chatMessage.create({
            data: {
              content,
              userId: currentUserId,
              userName: currentUserName,
              roomId: room.id,
            },
          });
        }
      } catch (e) {
        console.error('Failed to save chat message:', e);
      }
    });

    // ============================================================
    // Subtitle relay (preserved)
    // ============================================================
    socket.on('subtitle', ({ meetingId, text, isFinal }: { meetingId: string; text: string; isFinal: boolean }) => {
      socket.to(meetingId).emit('subtitle', {
        userId: currentUserId,
        userName: currentUserName,
        text,
        isFinal,
        timestamp: Date.now(),
      });
    });

    // ============================================================
    // Whiteboard (preserved)
    // ============================================================
    socket.on('whiteboard:stroke', ({ meetingId, stroke }: { meetingId: string; stroke: any }) => {
      if (!whiteboardStrokes.has(meetingId)) {
        whiteboardStrokes.set(meetingId, []);
      }
      const strokes = whiteboardStrokes.get(meetingId)!;
      if (strokes.length >= serverConfig.maxWhiteboardStrokes) {
        strokes.shift();
      }
      strokes.push(stroke);
      socket.to(meetingId).emit('whiteboard:stroke', stroke);
    });

    socket.on('whiteboard:clear', ({ meetingId }: { meetingId: string }) => {
      whiteboardStrokes.set(meetingId, []);
      socket.to(meetingId).emit('whiteboard:clear');
    });

    // ============================================================
    // Poll events (preserved)
    // ============================================================
    socket.on('poll:created', ({ meetingId, poll }: { meetingId: string; poll: any }) => {
      socket.to(meetingId).emit('poll:created', poll);
    });

    socket.on('poll:vote', ({ meetingId, pollId, userId, userName, optionIdx }: { meetingId: string; pollId: string; userId: string; userName: string; optionIdx: number }) => {
      socket.to(meetingId).emit('poll:vote', { pollId, userId, userName, optionIdx });
    });

    socket.on('poll:closed', ({ meetingId, pollId }: { meetingId: string; pollId: string }) => {
      if (!['TEACHER', 'ADMIN', 'TA'].includes(currentRole)) {
        socket.emit('error', { message: 'Only hosts can close polls' });
        return;
      }
      socket.to(meetingId).emit('poll:closed', pollId);
    });

    // ============================================================
    // Kick user (preserved)
    // ============================================================
    socket.on('user:kick', ({ meetingId, targetUserId }: { meetingId: string; targetUserId: string }) => {
      if (!['TEACHER', 'ADMIN', 'TA'].includes(currentRole)) {
        socket.emit('error', { message: 'Only hosts can kick users' });
        return;
      }
      const roomMembers = rooms.get(meetingId);
      if (!roomMembers) return;

      for (const [socketId, member] of roomMembers.entries()) {
        if (member.userId === targetUserId) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit('user-kicked', { by: currentUserName });
            targetSocket.disconnect(true);
          }
          break;
        }
      }
    });

    // ============================================================
    // Media state updates (preserved)
    // ============================================================
    socket.on('media:state', ({ meetingId, isMuted, isCameraOff, isHandRaised }: { meetingId: string; isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }) => {
      const roomMembers = rooms.get(meetingId);
      if (roomMembers) {
        const member = roomMembers.get(socket.id);
        if (member) {
          if (isMuted !== undefined) member.isMuted = isMuted;
          if (isCameraOff !== undefined) member.isCameraOff = isCameraOff;
          if (isHandRaised !== undefined) member.isHandRaised = isHandRaised;
        }
      }

      socket.to(meetingId).emit('media:state', {
        userId: currentUserId,
        isMuted,
        isCameraOff,
        isHandRaised,
      });
    });

    // ============================================================
    // Leave room (preserved + SFU cleanup)
    // ============================================================
    socket.on('leave-room', ({ meetingId }: { meetingId: string }) => {
      handleLeave(socket, meetingId);
    });

    // Disconnect (preserved + SFU cleanup)
    socket.on('disconnect', () => {
      // Clean up SFU resources
      const sfuEntry = socketToSfuRoom.get(socket.id);
      if (sfuEntry) {
        sfuEntry.room.removePeer(socket.id);
        socketToSfuRoom.delete(socket.id);
        // If room is empty, close the SFU room
        if (sfuEntry.room.peerCount === 0) {
          sfuEntry.room.close();
          sfuRooms.delete(sfuEntry.meetingId);
        }
      }

      if (currentRoom) {
        handleLeave(socket, currentRoom);
      }
    });

    function handleLeave(sock: Socket, meetingId: string) {
      // Clean up SFU resources
      const sfuEntry = socketToSfuRoom.get(sock.id);
      if (sfuEntry) {
        sfuEntry.room.removePeer(sock.id);
        socketToSfuRoom.delete(sock.id);
        if (sfuEntry.room.peerCount === 0) {
          sfuEntry.room.close();
          sfuRooms.delete(sfuEntry.meetingId);
        }
      }

      const roomMembers = rooms.get(meetingId);
      if (roomMembers) {
        roomMembers.delete(sock.id);
        sock.to(meetingId).emit('user-left', { userId: currentUserId, socketId: sock.id });
        io.to(meetingId).emit('participants-update', {
          participants: Array.from(roomMembers.values()),
        });

        if (roomMembers.size === 0) {
          rooms.delete(meetingId);
          whiteboardStrokes.delete(meetingId);
        }
      }
      sock.leave(meetingId);
      currentRoom = null;
      console.log(`${currentUserName} left room ${meetingId}`);
    }
  });
}
