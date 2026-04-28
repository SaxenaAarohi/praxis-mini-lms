import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: { variant?: ToastVariant; title: string; description?: string; durationMs?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: { variant?: ToastVariant; title: string; description?: string; durationMs?: number }) => {
      const id = nextId++;
      const next: Toast = {
        id,
        variant: input.variant ?? 'info',
        title: input.title,
        description: input.description,
      };
      setToasts((all) => [...all, next]);
      const duration = input.durationMs ?? 3500;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push({ variant: 'success', title, description }),
      error: (title, description) => push({ variant: 'error', title, description }),
      info: (title, description) => push({ variant: 'info', title, description }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(96vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'card p-3 pr-8 flex items-start gap-3 animate-slide-up shadow-lg relative',
              t.variant === 'success' && 'border-emerald-200 bg-emerald-50',
              t.variant === 'error' && 'border-red-200 bg-red-50',
              t.variant === 'info' && 'border-brand-200 bg-brand-50',
            )}
          >
            {t.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.variant === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {t.variant === 'info' && <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />}
            <div className="text-sm flex-1">
              <div className="font-medium text-slate-900">{t.title}</div>
              {t.description && <div className="mt-0.5 text-slate-600">{t.description}</div>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
