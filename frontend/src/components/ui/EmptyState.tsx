import { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('card p-8 text-center flex flex-col items-center gap-3', className)}>
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <div className="font-semibold text-slate-900">{title}</div>
      {description && <p className="text-sm text-slate-600 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
