import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, FileText, ClipboardList, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminStats } from '@/types/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { fromNow } from '@/lib/format';

export function AdminDashboardPage(): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.dashboard.admin(),
  });

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }
  if (isError || !data) return <p className="text-sm text-red-600">Could not load admin stats.</p>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Total users" value={data.totals.users} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Articles" value={data.totals.articles} icon={<FileText className="w-5 h-5" />} tone="green" />
        <StatCard label="Submissions" value={data.totals.submissions} icon={<ClipboardList className="w-5 h-5" />} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Top articles by submissions</h3>
          {data.topArticles.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.topArticles.map((a: AdminStats['topArticles'][number]) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                  <Link to={`/articles/${a.slug}`} className="text-sm font-medium hover:text-brand-700 truncate">
                    {a.title}
                  </Link>
                  <span className="text-xs text-slate-500">{a.submissions} submissions</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent submissions</h3>
            <Link to="/admin/articles" className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1">
              Manage articles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recentSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentSubmissions.map((s: AdminStats['recentSubmissions'][number]) => (
                <li key={s.id} className="py-2 flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-900 truncate flex-1">
                    {s.user.name} <span className="text-slate-500">→ {s.article.title}</span>
                  </span>
                  <span className="text-xs text-slate-500">{s.percentage.toFixed(0)}%</span>
                  <span className="text-xs text-slate-400">{fromNow(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Newest learners</h3>
        {data.recentUsers.length === 0 ? (
          <p className="text-sm text-slate-500">No users yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentUsers.map((u: AdminStats['recentUsers'][number]) => (
              <li key={u.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium flex-1 truncate">{u.name}</span>
                <span className="text-xs text-slate-500 truncate hidden sm:inline">{u.email}</span>
                <span className="text-xs text-slate-400">{fromNow(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
