import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { LeaderboardEntry } from '@/types/api';

export function useLeaderboard(limit = 20): {
  data: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  live: boolean;
} {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.leaderboard
      .top(limit)
      .then((rows: LeaderboardEntry[]) => {
        if (mounted) {
          setData(rows);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) setError('Could not load leaderboard');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const socket = getSocket();
    const onConnect = () => {
      setLive(true);
      socket.emit('leaderboard:join');
    };
    const onDisconnect = () => setLive(false);
    const onUpdate = (payload: { top: LeaderboardEntry[] }) => {
      if (payload?.top) setData(payload.top.slice(0, limit));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('leaderboard:updated', onUpdate);

    if (socket.connected) onConnect();

    return () => {
      mounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('leaderboard:updated', onUpdate);
      socket.emit('leaderboard:leave');
    };
  }, [limit]);

  return { data, loading, error, live };
}
