import { io, Socket } from 'socket.io-client';
import { storage } from '@/utils/storage';

const url = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;

  socket = io(url, {
    auth: { token: storage.getToken() ?? undefined },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1_000,
  });
  return socket;
}

export function refreshSocketAuth(): void {
  if (!socket) return;
  socket.auth = { token: storage.getToken() ?? undefined };
  socket.disconnect().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
