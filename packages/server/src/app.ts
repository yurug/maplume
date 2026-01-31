import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import projectsRoutes from './routes/projects';
import friendsRoutes from './routes/friends';
import sharesRoutes from './routes/shares';
import interactionsRoutes from './routes/interactions';
import partiesRoutes from './routes/parties';
import statsRoutes from './routes/stats';

// Track database status
let dbStatus: { ready: boolean; error?: string; lastAttempt?: number } = { ready: false };

export function setDbStatus(ready: boolean, error?: string): void {
  dbStatus = { ready, error, lastAttempt: Date.now() };
}

export function getDbStatus(): typeof dbStatus {
  return dbStatus;
}

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: true, // Allow all origins for desktop app
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing - reduced from 10mb to 6mb (slightly above maxEncryptedBlobSize for overhead)
  app.use(express.json({ limit: '6mb' }));

  // Global API rate limiting
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.api.windowMs,
    max: config.rateLimit.api.max,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health/debug endpoints
      return req.path === '/health' || req.path === '/debug';
    },
  });
  app.use('/api', apiLimiter);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Debug endpoint (shows connection info without secrets)
  app.get('/debug', (_req: Request, res: Response) => {
    // Parse DATABASE_URL to show host/db without credentials
    let dbInfo: { host?: string; port?: string; database?: string; ssl?: boolean } = {};
    try {
      const url = new URL(config.databaseUrl);
      dbInfo = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.replace('/', ''),
        ssl: url.searchParams.get('sslmode') === 'require',
      };
    } catch {
      dbInfo = { host: 'invalid-url' };
    }

    res.json({
      status: 'debug',
      timestamp: Date.now(),
      database: {
        ...dbInfo,
        status: dbStatus,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: config.port,
      },
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/friends', friendsRoutes);
  app.use('/api/shares', sharesRoutes);
  app.use('/api/shares', interactionsRoutes); // Comments and reactions under /api/shares/:shareId
  app.use('/api/parties', partiesRoutes);
  app.use('/api/stats', statsRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
