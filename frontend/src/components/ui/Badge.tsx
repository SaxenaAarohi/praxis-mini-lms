import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate';

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}): JSX.Element {
  return <span className={cn('badge', toneClasses[tone], className)}>{children}</span>;
}
