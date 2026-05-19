import { Router } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../prisma.js';
export const roomsRouter = Router();

// Create a room (public)
roomsRouter.post('/', async (req, res) => {
  try {
    const { name, password } = req.body;
    const meetingId = randomBytes(4).toString('hex').toUpperCase();

    const room = await prisma.room.create({
      data: {
        meetingId,
        name: name || `Meeting ${meetingId}`,
        hostId: 'anonymous',
        password: password || null,
      },
    });

    res.json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

// Get room by meeting ID
roomsRouter.get('/:meetingId', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { meetingId: req.params.meetingId },
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Failed to get room' });
  }
});

// Join room (validate password if set)
roomsRouter.post('/:meetingId/join', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { meetingId: req.params.meetingId },
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (room.password && room.password !== req.body.password) {
      return res.status(403).json({ message: 'Invalid password' });
    }
    res.json(room);
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Failed to join room' });
  }
});
