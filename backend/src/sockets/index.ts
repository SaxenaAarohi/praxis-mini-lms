import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../utils/jwt';
import { registerLeaderboardHandlers } from './leaderboard.socket';

let ioInstance: IOServer | null = null;

export function initSocket(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers?.authorization?.toString().replace(/^Bearer\s+/i, ''));
      if (!token) return next(new Error('Auth token required'));
      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      next();
    } catch (err) {
      logger.warn({ err }, 'socket auth failed');
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user?.id }, 'socket connected');
    registerLeaderboardHandlers(socket);
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): IOServer {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}
