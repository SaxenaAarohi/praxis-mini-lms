import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Award,
  Flame,
  Target,
  TrendingUp,
  BookOpen,
  Trophy,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { ScoreOverTimeChart } from '@/components/dashboard/ScoreOverTimeChart';
import { TagBreakdownChart } from '@/components/dashboard/TagBreakdownChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Badge } from '@/components/ui/Badge';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'me'],
    queryFn: () => api.dashboard.me(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your progress and keep your streak alive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/articles" className="btn-primary">
            <BookOpen className="w-4 h-4" />
            Browse articles
          </Link>
          <Link to="/leaderboard" className="btn-secondary">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="card p-6 text-sm text-red-600">Could not load your dashboard data.</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Assignments attempted"
              value={data.totals.attempted}
              icon={<Activity className="w-5 h-5" />}
              hint={`${data.totals.passed} passed`}
              tone="brand"
            />
            <StatCard
              label="Average score"
              value={`${(data.totals.avgPercentage ?? 0).toFixed(1)}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              hint="Across all submissions"
              tone="green"
            />
            <StatCard
              label="Articles practiced"
              value={data.totals.distinctArticles}
              icon={<Target className="w-5 h-5" />}
              hint="Unique articles with attempts"
              tone="slate"
            />
            <StatCard
              label="Current streak"
              value={`${data.gamification.streak}d`}
              icon={<Flame className="w-5 h-5" />}
              hint={data.gamification.streak > 0 ? 'Keep it going!' : 'Submit today to start a streak'}
              tone="amber"
            />
          </div>

          {data.gamification.badges.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold">Badges</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.gamification.badges.map((b: string) => (
                  <Badge key={b} tone="amber">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <ScoreOverTimeChart data={data.scoreOverTime} />
              <TagBreakdownChart data={data.tagBreakdown} />
            </div>
            <div className="space-y-4">
              <RecentActivity items={data.recentActivity} />
              <Link to="/chat" className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">Ask the AI tutor</div>
                  <div className="text-xs text-slate-500">Get explanations and study help</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
