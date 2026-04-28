import type { Socket } from 'socket.io';
import { getIO } from './index';

const LEADERBOARD_ROOM = 'leaderboard';

export function registerLeaderboardHandlers(socket: Socket): void {
  socket.on('leaderboard:join', () => {
    socket.join(LEADERBOARD_ROOM);
    socket.emit('leaderboard:joined', { room: LEADERBOARD_ROOM });
  });

  socket.on('leaderboard:leave', () => {
    socket.leave(LEADERBOARD_ROOM);
  });
}

let lastEmitAt = 0;
const EMIT_THROTTLE_MS = 500;

export function emitLeaderboardUpdated(payload: unknown): void {
  const now = Date.now();
  if (now - lastEmitAt < EMIT_THROTTLE_MS) return;
  lastEmitAt = now;
  try {
    getIO().to(LEADERBOARD_ROOM).emit('leaderboard:updated', payload);
  } catch {
    // Socket not initialised yet (e.g., during seed) — ignore.
  }
}
