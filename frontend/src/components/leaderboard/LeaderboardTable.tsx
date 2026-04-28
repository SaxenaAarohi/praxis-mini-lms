import type { LeaderboardEntry } from '@/types/api';
import { RankBadge } from './RankBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

interface Props {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}

export function LeaderboardTable({ entries, highlightUserId }: Props): JSX.Element {
  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 w-16">Rank</th>
              <th className="px-4 py-2">Learner</th>
              <th className="px-4 py-2">Avg score</th>
              <th className="px-4 py-2">Completion</th>
              <th className="px-4 py-2">Composite</th>
              <th className="px-4 py-2">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={e.userId}
                className={cn(
                  'border-b last:border-b-0 border-slate-100 transition-colors',
                  highlightUserId === e.userId ? 'bg-brand-50' : 'hover:bg-slate-50',
                )}
              >
                <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{e.name}</div>
                  {e.badges.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {e.badges.slice(0, 3).map((b) => (
                        <Badge key={b} tone="amber">{b}</Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{e.avgScore.toFixed(1)}%</td>
                <td className="px-4 py-3">{e.completionRate.toFixed(1)}%</td>
                <td className="px-4 py-3 font-semibold text-brand-700">{e.compositeScore.toFixed(1)}</td>
                <td className="px-4 py-3 text-slate-500">{e.totalSubmissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {entries.map((e, i) => (
          <div
            key={e.userId}
            className={cn(
              'card p-3 flex items-center gap-3',
              highlightUserId === e.userId && 'border-brand-300 bg-brand-50',
            )}
          >
            <RankBadge rank={i + 1} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">{e.name}</div>
              <div className="text-xs text-slate-500">
                Avg {e.avgScore.toFixed(1)}% · Completion {e.completionRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-brand-700">{e.compositeScore.toFixed(1)}</div>
              <div className="text-[10px] text-slate-500">composite</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
