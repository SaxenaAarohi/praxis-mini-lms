import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'brand' | 'green' | 'amber' | 'slate';
}

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function StatCard({ label, value, hint, icon, tone = 'brand' }: Props): JSX.Element {
  return (
    <div className="card p-4 flex items-start gap-3">
      {icon && (
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', toneClasses[tone])}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500 truncate">{hint}</div>}
      </div>
    </div>
  );
}
