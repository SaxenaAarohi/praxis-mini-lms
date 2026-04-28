import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env, isDev } from './config/env';
import { connectPrisma, disconnectPrisma, prisma } from './config/prisma';
import { logger } from './config/logger';
import { requestId } from './middleware/requestId.middleware';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import routes from './routes';
import { initSocket } from './sockets';

async function bootstrap(): Promise<void> {
  await connectPrisma();
  logger.info('✅ Prisma connected to MongoDB');

  const app: Application = express();

  // Hardening
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Global middleware
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

  // API routes (rate-limited)
  app.use('/api', generalLimiter);
  app.use('/api', routes);

  // 404 + central error handler (must be last)
  app.use(notFound);
  app.use(errorHandler);

  // Start listening — app.listen() returns the underlying http.Server
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 mini-lms backend listening on http://localhost:${env.PORT}`);
  });

  // Socket.io attaches to the same http.Server so HTTP + WebSocket share one port
  initSocket(server);

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    server.close(() => logger.info('http server closed'));
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'failed to bootstrap server');
  process.exit(1);
});
