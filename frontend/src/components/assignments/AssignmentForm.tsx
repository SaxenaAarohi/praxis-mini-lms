import { useState } from 'react';
import { Send } from 'lucide-react';
import type { AssignmentPublic, McqQuestionPublic, ShortQuestionPublic } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { HintButton } from './HintButton';
import { cn } from '@/utils/cn';

interface Props {
  assignment: AssignmentPublic;
  onSubmit: (answers: SubmittedAnswer[]) => Promise<void> | void;
  submitting?: boolean;
}

export interface SubmittedAnswer {
  questionId: string;
  type: 'MCQ' | 'SHORT';
  mcqIndex?: number;
  text?: string;
}

export function AssignmentForm({ assignment, onSubmit, submitting }: Props): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, { mcqIndex?: number; text?: string }>>({});

  const isComplete = assignment.questions.every((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === 'MCQ') return typeof a.mcqIndex === 'number';
    return Boolean(a.text && a.text.trim().length > 0);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    const payload: SubmittedAnswer[] = assignment.questions.map((q) => {
      const a = answers[q.id];
      if (q.type === 'MCQ') return { questionId: q.id, type: 'MCQ', mcqIndex: a.mcqIndex };
      return { questionId: q.id, type: 'SHORT', text: (a.text ?? '').trim() };
    });
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {assignment.questions.map((q, idx) => (
        <div key={q.id} className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wide font-semibold text-brand-700">
                Q{idx + 1} • {q.type === 'MCQ' ? 'Multiple choice' : 'Short answer'}
              </span>
              <h4 className="text-base font-semibold mt-1">{q.prompt}</h4>
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{q.points} pts</span>
          </div>

          {q.type === 'MCQ' ? (
            <McqOptions
              question={q as McqQuestionPublic}
              value={answers[q.id]?.mcqIndex}
              onChange={(idx) =>
                setAnswers((prev) => ({ ...prev, [q.id]: { mcqIndex: idx } }))
              }
            />
          ) : (
            <ShortAnswer
              question={q as ShortQuestionPublic}
              articleId={assignment.articleId}
              value={answers[q.id]?.text ?? ''}
              onChange={(text) => setAnswers((prev) => ({ ...prev, [q.id]: { text } }))}
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {Object.keys(answers).length} of {assignment.questions.length} answered
        </p>
        <Button
          type="submit"
          disabled={!isComplete}
          loading={submitting}
          icon={<Send className="w-4 h-4" />}
        >
          Submit assignment
        </Button>
      </div>
    </form>
  );
}

function McqOptions({
  question,
  value,
  onChange,
}: {
  question: McqQuestionPublic;
  value: number | undefined;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options.map((opt, idx) => {
        const selected = value === idx;
        return (
          <label
            key={idx}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors',
              selected
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <input
              type="radio"
              name={question.id}
              checked={selected}
              onChange={() => onChange(idx)}
              className="mt-1 accent-brand-600"
            />
            <span className="text-sm text-slate-800">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function ShortAnswer({
  question,
  articleId,
  value,
  onChange,
}: {
  question: ShortQuestionPublic;
  articleId: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Write your answer here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        hint={
          question.maxWords
            ? `${wordCount} / ${question.maxWords} words`
            : `${wordCount} words`
        }
      />
      <HintButton articleId={articleId} questionId={question.id} draft={value} />
    </div>
  );
}
