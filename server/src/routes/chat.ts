import { Router } from 'express';
import { prisma } from '../prisma.js';

export const chatRouter = Router();

// Load the latest messages so opening the chat panel is not limited to events
// received after the current browser joined the meeting.
chatRouter.get('/:meetingId', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { meetingId: String(req.params.meetingId) },
      select: { id: true },
    });
    if (!room) return res.json([]);

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(messages.reverse().map((message) => ({
      id: message.id,
      content: message.content,
      userId: message.userId,
      userName: message.userName,
      roomId: String(req.params.meetingId),
      createdAt: message.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Failed to get chat messages' });
  }
});
