import { Router } from 'express';
import { prisma } from '../prisma.js';

export const pollsRouter = Router();

// Get all polls for a room
pollsRouter.get('/:meetingId', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { meetingId: req.params.meetingId } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const polls = await prisma.poll.findMany({
      where: { roomId: room.id },
      include: { votes: true },
      orderBy: { createdAt: 'desc' },
    });

    const result = polls.map((p) => ({
      id: p.id,
      question: p.question,
      options: JSON.parse(p.options),
      isActive: p.isActive,
      createdBy: p.createdBy,
      createdAt: p.createdAt.toISOString(),
      votes: p.votes.map((v) => ({
        id: v.id,
        pollId: v.pollId,
        userId: v.userId,
        userName: v.userName,
        optionIdx: v.optionIdx,
      })),
      totalVotes: p.votes.length,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ message: 'Failed to get polls' });
  }
});

// Create a poll
pollsRouter.post('/:meetingId', async (req, res) => {
  try {
    const { question, options, createdBy } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question and at least 2 options required' });
    }

    const room = await prisma.room.findUnique({ where: { meetingId: req.params.meetingId } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const poll = await prisma.poll.create({
      data: {
        roomId: room.id,
        question,
        options: JSON.stringify(options),
        createdBy: createdBy || 'Anonymous',
      },
      include: { votes: true },
    });

    const result = {
      id: poll.id,
      question: poll.question,
      options: JSON.parse(poll.options),
      isActive: poll.isActive,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt.toISOString(),
      votes: [],
      totalVotes: 0,
    };

    res.json(result);
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ message: 'Failed to create poll' });
  }
});

// Vote on a poll
pollsRouter.post('/:pollId/vote', async (req, res) => {
  try {
    const { userId, userName, optionIdx } = req.body;
    if (!userId || optionIdx === undefined || typeof optionIdx !== 'number') {
      return res.status(400).json({ message: 'userId and optionIdx (number) required' });
    }

    // Fetch poll to validate
    const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isActive) return res.status(400).json({ message: 'Poll is closed' });

    const options = JSON.parse(poll.options) as string[];
    if (optionIdx < 0 || optionIdx >= options.length) {
      return res.status(400).json({ message: 'Invalid option index' });
    }

    // Check for existing vote (unique constraint)
    const existing = await prisma.vote.findUnique({
      where: { pollId_userId: { pollId: req.params.pollId, userId } },
    });
    if (existing) {
      return res.status(409).json({ message: 'Already voted' });
    }

    const vote = await prisma.vote.create({
      data: {
        pollId: req.params.pollId,
        userId,
        userName: userName || 'Anonymous',
        optionIdx,
      },
    });

    res.json(vote);
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Failed to vote' });
  }
});

// Close a poll
pollsRouter.patch('/:pollId/close', async (req, res) => {
  try {
    const poll = await prisma.poll.update({
      where: { id: req.params.pollId },
      data: { isActive: false },
    });
    res.json(poll);
  } catch (error) {
    console.error('Close poll error:', error);
    res.status(500).json({ message: 'Failed to close poll' });
  }
});
