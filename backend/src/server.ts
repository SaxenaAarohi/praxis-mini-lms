import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectPrisma, disconnectPrisma } from './config/prisma';
import { initSocket } from './sockets';

async function bootstrap(): Promise<void> {
  await connectPrisma();
  logger.info('✅ Prisma connected to MongoDB');

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(`🚀 mini-lms backend listening on http://localhost:${env.PORT}`);
  });

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
