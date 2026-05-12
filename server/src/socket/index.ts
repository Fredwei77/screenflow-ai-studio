import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { serverConfig } from '../config.js';

// In-memory room state: meetingId -> Map<socketId, { userId, userName }>
const rooms = new Map<string, Map<string, { userId: string; userName: string }>>();

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
        // Ignore DB errors for now
      }

      console.log(`${currentUserName} joined room ${meetingId} (${roomMembers.size} total)`);
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

    // Media state updates
    socket.on('media:state', ({ meetingId, ...state }: { meetingId: string; isMuted?: boolean; isCameraOff?: boolean; isHandRaised?: boolean }) => {
      // Update in-memory state
      const roomMembers = rooms.get(meetingId);
      if (roomMembers) {
        const member = roomMembers.get(socket.id);
        if (member) {
          Object.assign(member, state);
        }
      }

      // Broadcast to others
      socket.to(meetingId).emit('media:state', {
        userId: currentUserId,
        ...state,
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
        }
      }
      sock.leave(meetingId);
      currentRoom = null;
      console.log(`${currentUserName} left room ${meetingId}`);
    }
  });
}
