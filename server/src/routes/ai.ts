import { Router } from 'express';
import { generateQuestion, analyzePerformance, generateMeetingSummary } from '../services/aiService.js';

export const aiRouter = Router();

aiRouter.post('/questions', async (req, res) => {
  try {
    const { context, tone } = req.body;
    if (!context || context.length < 10) {
      return res.status(400).json({ message: 'Context too short' });
    }
    const question = await generateQuestion(context, tone || 'professional');
    res.json(question);
  } catch (error) {
    console.error('AI question error:', error);
    res.status(500).json({ message: 'Failed to generate question' });
  }
});

aiRouter.post('/analyze', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || transcript.length < 30) {
      return res.json([]);
    }
    const metrics = await analyzePerformance(transcript);
    res.json(metrics);
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ message: 'Failed to analyze performance' });
  }
});

aiRouter.post('/summary', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || transcript.length < 50) {
      return res.status(400).json({ message: 'Transcript too short to summarize' });
    }
    const summary = await generateMeetingSummary(transcript);
    if (!summary) {
      return res.status(500).json({ message: 'Failed to generate summary' });
    }
    res.json(summary);
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
});
