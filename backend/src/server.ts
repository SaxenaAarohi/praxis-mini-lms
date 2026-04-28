import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import { connectPrisma } from './config/prisma';
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

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);

  app.use('/api', generalLimiter);
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 mini-lms backend listening on http://localhost:${env.PORT}`);
  });

  initSocket(server);

  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'failed to bootstrap server');
  process.exit(1);
});
