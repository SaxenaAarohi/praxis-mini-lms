import { cn } from '@/utils/cn';
import { Hash } from 'lucide-react';

interface Props {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function Tag({ label, active, count, onClick, className }: Props): JSX.Element {
  const isButton = Boolean(onClick);
  const Comp = isButton ? 'button' : 'span';
  return (
    <Comp
      type={isButton ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white hover:bg-brand-700'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        className,
      )}
    >
      <Hash className="w-3 h-3" />
      {label}
      {typeof count === 'number' && (
        <span className={cn('text-[10px] ml-0.5', active ? 'text-white/80' : 'text-slate-500')}>
          {count}
        </span>
      )}
    </Comp>
  );
}
