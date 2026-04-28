import { useQuery } from '@tanstack/react-query';
import { Award, Flame, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { fromNow } from '@/lib/format';

export function ProfilePage(): JSX.Element {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'submissions'],
    queryFn: () => api.submissions.listMine({ page: 1, limit: 20 }),
  });

  if (!user) return <></>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 text-xl font-bold flex items-center justify-center">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total points"
          value={user.gamification.totalPoints}
          icon={<Star className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="Day streak"
          value={`${user.gamification.streak}d`}
          icon={<Flame className="w-5 h-5" />}
          hint={user.gamification.lastActivityAt ? `Last: ${fromNow(user.gamification.lastActivityAt)}` : 'No activity yet'}
          tone="amber"
        />
        <StatCard
          label="Avg score"
          value={`${user.stats.avgScore.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="green"
        />
        <StatCard
          label="Badges"
          value={user.gamification.badges.length}
          icon={<Award className="w-5 h-5" />}
          tone="brand"
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          Achievements
        </h3>
        {user.gamification.badges.length === 0 ? (
          <p className="text-sm text-slate-500">
            No badges yet — submit assignments and build your streak to unlock them.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.gamification.badges.map((b) => (
              <Badge key={b} tone="amber">
                {b}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Submission history</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No submissions yet" description="Read an article and try its practice assignment." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((s) => (
              <li key={s.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {s.percentage.toFixed(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{s.article?.title ?? '—'}</div>
                  <div className="text-xs text-slate-500">{fromNow(s.createdAt)}</div>
                </div>
                <Badge tone={s.percentage >= 60 ? 'green' : 'amber'}>
                  {s.totalPoints}/{s.maxPoints}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
