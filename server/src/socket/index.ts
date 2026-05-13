import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { serverConfig } from '../config.js';

// In-memory room state: meetingId -> Map<socketId, { userId, userName, mediaState }>
const rooms = new Map<string, Map<string, { userId: string; userName: string; isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }>>();

// In-memory whiteboard strokes per room
const whiteboardStrokes = new Map<string, any[]>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let currentUserId: string = socket.id;
    let currentUserName: string = 'Anonymous';

    // Try to extract userId from JWT auth token
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, serverConfig.jwtSecret) as { userId: string };
        currentUserId = decoded.userId;
      }
    } catch {
      // Token invalid or missing — fall back to socket.id
    }

    // Join room
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
      roomMembers.set(socket.id, { userId: currentUserId, userName: currentUserName });
      socket.join(meetingId);

      // Notify existing members about new user
      socket.to(meetingId).emit('user-joined', {
        userId: currentUserId,
        userName: currentUserName,
        socketId: socket.id,
      });

      // Send room state to the new user
      const participants = Array.from(roomMembers.entries())
        .filter(([id]) => id !== socket.id)
        .map(([, data]) => ({ userId: data.userId, userName: data.userName }));

      socket.emit('room-joined', {
        userId: currentUserId,
        participants,
      });

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
    });

    // WebRTC signaling
    socket.on('signal', ({ type, to, data }: { type: string; to: string; data: any }) => {
      // Find target socket by userId
      const roomMembers = rooms.get(currentRoom || '');
      if (!roomMembers) return;

      for (const [socketId, member] of roomMembers.entries()) {
        if (member.userId === to && socketId !== socket.id) {
          io.to(socketId).emit('signal', {
            type,
            from: currentUserId,
            data,
          });
          break;
        }
      }
    });

    // Chat message
    socket.on('chat:message', async ({ roomId, content }: { roomId: string; content: string }) => {
      // Verify sender is in the room
      if (roomId !== currentRoom) return;
      const message = {
        id: crypto.randomUUID(),
        content,
        userId: currentUserId,
        userName: currentUserName,
        roomId,
        createdAt: new Date().toISOString(),
      };

      // Broadcast to room (roomId is the meetingId used as socket room name)
      io.to(roomId).emit('chat:message', message);

      // Save to DB — look up Room by meetingId to get the FK
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

    // Subtitle relay
    socket.on('subtitle', ({ meetingId, text, isFinal }: { meetingId: string; text: string; isFinal: boolean }) => {
      socket.to(meetingId).emit('subtitle', {
        userId: currentUserId,
        userName: currentUserName,
        text,
        isFinal,
        timestamp: Date.now(),
      });
    });

    // Whiteboard stroke relay
    socket.on('whiteboard:stroke', ({ meetingId, stroke }: { meetingId: string; stroke: any }) => {
      if (!whiteboardStrokes.has(meetingId)) {
        whiteboardStrokes.set(meetingId, []);
      }
      whiteboardStrokes.get(meetingId)!.push(stroke);
      socket.to(meetingId).emit('whiteboard:stroke', stroke);
    });

    // Whiteboard clear
    socket.on('whiteboard:clear', ({ meetingId }: { meetingId: string }) => {
      whiteboardStrokes.set(meetingId, []);
      socket.to(meetingId).emit('whiteboard:clear');
    });

    // Poll events
    socket.on('poll:created', ({ meetingId, poll }: { meetingId: string; poll: any }) => {
      socket.to(meetingId).emit('poll:created', poll);
    });

    socket.on('poll:vote', ({ meetingId, pollId, userId, userName, optionIdx }: { meetingId: string; pollId: string; userId: string; userName: string; optionIdx: number }) => {
      socket.to(meetingId).emit('poll:vote', { pollId, userId, userName, optionIdx });
    });

    socket.on('poll:closed', ({ meetingId, pollId }: { meetingId: string; pollId: string }) => {
      socket.to(meetingId).emit('poll:closed', pollId);
    });

    // Media state updates
    socket.on('media:state', ({ meetingId, isMuted, isCameraOff, isHandRaised }: { meetingId: string; isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }) => {
      // Update in-memory state (only allowed keys)
      const roomMembers = rooms.get(meetingId);
      if (roomMembers) {
        const member = roomMembers.get(socket.id);
        if (member) {
          if (isMuted !== undefined) member.isMuted = isMuted;
          if (isCameraOff !== undefined) member.isCameraOff = isCameraOff;
          if (isHandRaised !== undefined) member.isHandRaised = isHandRaised;
        }
      }

      // Broadcast to others
      socket.to(meetingId).emit('media:state', {
        userId: currentUserId,
        isMuted,
        isCameraOff,
        isHandRaised,
      });
    });

    // Leave room
    socket.on('leave-room', ({ meetingId }: { meetingId: string }) => {
      handleLeave(socket, meetingId);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentRoom) {
        handleLeave(socket, currentRoom);
      }
    });

    function handleLeave(sock: Socket, meetingId: string) {
      const roomMembers = rooms.get(meetingId);
      if (roomMembers) {
        roomMembers.delete(sock.id);
        sock.to(meetingId).emit('user-left', { userId: currentUserId });
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
