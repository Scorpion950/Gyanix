import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { notificationsRouter } from './routes/notifications.js';
import { learningPathsRouter } from './routes/learningPaths.js';
import { notesRouter } from './routes/notes.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiRouter } from './routes/ai.js';
import { codingRouter } from './routes/coding.js';
import { socialFeedRouter } from './routes/socialFeed.js';
import { messagingRouter } from './routes/messaging.js';
import { roomsRouter } from './routes/rooms.js';
import { env } from './config/env.js';

export function createApp(): express.Application {
  const app = express();

  // ─── Security middleware ───────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // needed for YouTube iframe
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.youtube.com'],
          frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", env.SUPABASE_URL],
        },
      },
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl) in development
        if (!origin || env.NODE_ENV === 'development') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ─── Body parsing (with size limits) ─────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/learning-paths', learningPathsRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/coding', codingRouter);
  app.use('/api/feed', socialFeedRouter);
  app.use('/api/messages', messagingRouter);
  app.use('/api/rooms', roomsRouter);

  // ─── Global error handler (must be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
}
