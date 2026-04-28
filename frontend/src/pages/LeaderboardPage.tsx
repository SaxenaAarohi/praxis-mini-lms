import { useEffect, useState } from 'react';
import { Trophy, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import type { RankInfo } from '@/types/api';
import { cn } from '@/utils/cn';

export function LeaderboardPage(): JSX.Element {
  const { user } = useAuth();

  // Top-N list — refreshed in real time by the useLeaderboard hook
  // (REST initial fetch + Socket.io live updates).
  const { data, loading, error, live } = useLeaderboard(20);

  // Current user's rank — separate one-shot fetch on mount.
  const [rank, setRank] = useState<RankInfo | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await api.leaderboard.myRank();
        if (alive) setRank(result);
      } catch {
        if (alive) setRank(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                live ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
              )}
              title={live ? 'Live updates active' : 'Reconnecting…'}
            >
              {live ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {live ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Ranked by a composite of average score (70%) and completion rate (30%).
          </p>
        </div>

        {rank?.rank && (
          <div className="card p-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div className="text-sm">
              <div className="font-medium">
                You're #{rank.rank} of {rank.total}
              </div>
              {rank.entry && (
                <div className="text-xs text-slate-500">
                  {rank.entry.compositeScore.toFixed(1)} composite ·{' '}
                  {rank.entry.avgScore.toFixed(1)}% avg
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load leaderboard" description={error} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Be the first to submit an assignment and claim the top spot."
        />
      ) : (
        <LeaderboardTable entries={data} highlightUserId={user?.id} />
      )}
    </div>
  );
}
