import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import livekitRouter from './routes/livekit.js';
import interviewRouter from './routes/interview.js';
import avatarRouter from './routes/avatar.js';
import roomsRouter from './routes/rooms.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import jobsRouter from './routes/jobs.js';
import candidatesRouter from './routes/candidates.js';
import placementsRouter from './routes/placements.js';
import resumesRouter from './routes/resumes.js';
import auditLogsRouter from './routes/auditLogs.js';
import { setupGeminiProxyWS } from './services/geminiProxy.js';
import { roomLifecycleManager } from './services/roomLifecycleManager.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/gemini-proxy' });

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001', 'https://stasia-mediastinal-fathomlessly.ngrok-free.dev'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increased for audio/video data

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), proxy: true });
});

// Routes
app.use('/api/livekit', livekitRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/avatar', avatarRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/placements', placementsRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/audit-logs', auditLogsRouter);

// Serve avatar videos
app.use('/avatar_output', express.static('avatar_output'));

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    type: err.type || 'UnknownError'
  });
});

// WebSocket for Gemini Live proxy
setupGeminiProxyWS(wss);

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`✅ WebSocket server ready at ws://localhost:${PORT}/ws/gemini-proxy`);
  console.log(`\n📋 Make sure these services are running:`);
  console.log(`   - LiveKit server: ws://localhost:7880 (run: .\\livekit\\livekit-server.exe --config livekit\\livekit-config.yaml)`);
  console.log(`   - LiveKit REST API: http://localhost:7881`);
  console.log(`   - Redis (optional): redis://localhost:6379`);

  // Start room lifecycle manager
  roomLifecycleManager.start();
  console.log(`✅ Room Lifecycle Manager started`);
});
