import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}
