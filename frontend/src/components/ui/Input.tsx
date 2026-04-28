import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, trailing, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-200',
            trailing && 'pr-10',
            className,
          )}
          {...rest}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">{trailing}</span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
