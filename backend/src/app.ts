import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env, isDev } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './config/logger';
import { requestId } from './middleware/requestId.middleware';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);

  if (isDev) {
    app.use(
      morgan('dev', {
        stream: { write: (msg) => logger.debug(msg.trim()) },
      }),
    );
  }

  // Health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    let dbOk = false;
    try {
      // Lightweight ping for Prisma + MongoDB
      await prisma.$runCommandRaw({ ping: 1 });
      dbOk = true;
    } catch (err) {
      logger.warn({ err }, 'health: db ping failed');
    }
    res.status(dbOk ? 200 : 503).json({
      ok: dbOk,
      service: 'mini-lms-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { db: dbOk },
    });
  });

  app.use('/api', generalLimiter);
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
