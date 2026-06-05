import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { serverConfig } from './config.js';
import { authRouter } from './routes/auth.js';
import { roomsRouter } from './routes/rooms.js';
import { aiRouter } from './routes/ai.js';
import { pollsRouter } from './routes/polls.js';
import { recordingsRouter } from './routes/recordings.js';
import { publishRouter } from './routes/publish.js';
import { chatRouter } from './routes/chat.js';
import { setupSocketHandlers, initSfuWorker } from './socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = serverConfig.nodeEnv === 'production'
  ? (serverConfig.corsOrigin ? [serverConfig.corsOrigin] : [])
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/polls', pollsRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/publish', publishRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Socket.IO
setupSocketHandlers(io);

// Serve frontend in production
if (serverConfig.nodeEnv === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  console.log('Serving static files from:', distPath);
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server — initialize SFU worker first, then listen
async function start() {
  try {
    await initSfuWorker();
  } catch (err) {
    console.error('[Server] SFU worker init failed, continuing without SFU:', err);
  }

  httpServer.listen(serverConfig.port, () => {
    console.log(`Server running on port ${serverConfig.port}`);
  });
}

start();
