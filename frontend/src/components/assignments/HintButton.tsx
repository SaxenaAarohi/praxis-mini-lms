import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { extractError } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface Props {
  articleId: string;
  questionId: string;
  draft?: string;
}

export function HintButton({ articleId, questionId, draft }: Props): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const toast = useToast();

  const onClick = async () => {
    setLoading(true);
    try {
      const { hint: text } = await api.ai.hint({ articleId, questionId, draft });
      setHint(text);
    } catch (err) {
      toast.error('Hint unavailable', extractError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" loading={loading} onClick={onClick} icon={<Lightbulb className="w-4 h-4" />}>
        {hint ? 'Get another hint' : 'Get a hint'}
      </Button>
      {hint && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 animate-fade-in">
          <span className="font-medium">Hint:</span> {hint}
        </div>
      )}
    </div>
  );
}
