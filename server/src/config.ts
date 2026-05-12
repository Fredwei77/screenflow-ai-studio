import dotenv from 'dotenv';
dotenv.config();

export const serverConfig = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
  maxParticipants: 4,
};
