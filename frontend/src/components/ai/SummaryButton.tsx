import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { extractError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

interface Props {
  articleId: string;
  initialSummary?: string | null;
}

export function SummaryButton({ articleId, initialSummary }: Props): JSX.Element {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [open, setOpen] = useState(Boolean(initialSummary));
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handle = async (refresh = false) => {
    setLoading(true);
    try {
      const data = await api.ai.summarize(articleId, refresh);
      setSummary(data.summary);
      setOpen(true);
    } catch (err) {
      toast.error('Could not generate summary', extractError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={summary ? 'secondary' : 'primary'}
          size="sm"
          loading={loading}
          icon={<Sparkles className="w-4 h-4" />}
          onClick={() => (summary ? setOpen((v) => !v) : handle(false))}
        >
          {summary ? (open ? 'Hide AI summary' : 'Show AI summary') : 'Summarize with AI'}
        </Button>
        {summary && (
          <button
            type="button"
            onClick={() => handle(true)}
            className="text-xs text-slate-500 hover:text-brand-700 underline"
          >
            Regenerate
          </button>
        )}
      </div>
      {summary && open && (
        <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-900 whitespace-pre-line animate-fade-in">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> AI Summary
          </div>
          {summary}
        </div>
      )}
    </div>
  );
}
