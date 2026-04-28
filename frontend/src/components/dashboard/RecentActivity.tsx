import { Link } from 'react-router-dom';
import type { Submission } from '@/types/api';
import { fromNow } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity } from 'lucide-react';

export function RecentActivity({ items }: { items: Submission[] }): JSX.Element {
  if (!items.length) {
    return (
      <EmptyState
        icon={<Activity className="w-6 h-6" />}
        title="No recent activity"
        description="Submitted assignments will show up here."
      />
    );
  }
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3">Recent activity</h3>
      <ul className="divide-y divide-slate-100">
        {items.map((s) => (
          <li key={s.id} className="py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
              {s.percentage.toFixed(0)}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/articles/${s.article?.slug ?? ''}`}
                className="font-medium text-sm text-slate-900 hover:text-brand-700 truncate block"
              >
                {s.article?.title ?? 'Untitled article'}
              </Link>
              <div className="text-xs text-slate-500">{fromNow(s.createdAt)}</div>
            </div>
            <Badge tone={s.percentage >= 60 ? 'green' : 'amber'}>
              {s.percentage >= 60 ? 'Passed' : 'Practice'}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
