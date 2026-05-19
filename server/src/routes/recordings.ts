import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

export const recordingsRouter = Router();

// Get recordings for a room (public)
recordingsRouter.get('/:meetingId', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { meetingId: String(req.params.meetingId) } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const recordings = await prisma.recordingMetadata.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(recordings.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ message: 'Failed to get recordings' });
  }
});

// Save recording metadata (public)
recordingsRouter.post('/:meetingId', async (req, res) => {
  try {
    const { userId, userName, fileName, fileSize, duration, mimeType } = req.body;
    if (!userId || !fileName) {
      return res.status(400).json({ message: 'userId and fileName required' });
    }

    const room = await prisma.room.findUnique({ where: { meetingId: String(req.params.meetingId) } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const recording = await prisma.recordingMetadata.create({
      data: {
        roomId: room.id,
        userId,
        userName: userName || 'Anonymous',
        fileName,
        fileSize: fileSize || 0,
        duration: duration || 0,
        mimeType: mimeType || 'video/webm',
      },
    });

    res.json({
      ...recording,
      createdAt: recording.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Save recording error:', error);
    res.status(500).json({ message: 'Failed to save recording' });
  }
});

// Delete recording metadata (TEACHER only)
recordingsRouter.delete('/:id', authMiddleware, requireRole('TEACHER', 'ADMIN', 'TA'), async (req: AuthRequest, res) => {
  try {
    await prisma.recordingMetadata.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ message: 'Failed to delete recording' });
  }
});
