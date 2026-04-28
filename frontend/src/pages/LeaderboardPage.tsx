import { useQuery } from '@tanstack/react-query';
import { Trophy, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { cn } from '@/utils/cn';

export function LeaderboardPage(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, live } = useLeaderboard(20);

  const rankQuery = useQuery({
    queryKey: ['leaderboard', 'rank'],
    queryFn: () => api.leaderboard.myRank(),
  });

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

        {rankQuery.data?.rank && (
          <div className="card p-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div className="text-sm">
              <div className="font-medium">
                You're #{rankQuery.data.rank} of {rankQuery.data.total}
              </div>
              {rankQuery.data.entry && (
                <div className="text-xs text-slate-500">
                  {rankQuery.data.entry.compositeScore.toFixed(1)} composite ·{' '}
                  {rankQuery.data.entry.avgScore.toFixed(1)}% avg
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
