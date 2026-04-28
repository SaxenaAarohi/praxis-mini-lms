import { cn } from '@/utils/cn';

export function RankBadge({ rank }: { rank: number }): JSX.Element {
  const tone =
    rank === 1
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : rank === 2
        ? 'bg-slate-200 text-slate-800 border-slate-300'
        : rank === 3
          ? 'bg-orange-100 text-orange-800 border-orange-200'
          : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold',
        tone,
      )}
    >
      {rank}
    </span>
  );
}
