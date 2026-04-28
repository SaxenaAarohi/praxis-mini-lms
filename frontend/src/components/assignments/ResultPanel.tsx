import { CheckCircle2, XCircle, Sparkles, Trophy, Award } from 'lucide-react';
import type { Submission, AssignmentPublic } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

interface Props {
  submission: Submission;
  assignment: AssignmentPublic;
  newBadges?: string[];
  onRetry?: () => void;
}

export function ResultPanel({ submission, assignment, newBadges, onRetry }: Props): JSX.Element {
  const passed = submission.percentage >= assignment.passingScore;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'card p-5 flex items-center gap-4',
          passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            passed ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800',
          )}
        >
          {passed ? <Trophy className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">
            {passed ? 'Great work — you passed!' : 'Keep going — almost there.'}
          </h3>
          <p className="text-sm text-slate-700">
            You scored <strong>{submission.percentage.toFixed(1)}%</strong> ({submission.totalPoints}/
            {submission.maxPoints} points). Passing score is {assignment.passingScore}%.
          </p>
        </div>
      </div>

      {newBadges && newBadges.length > 0 && (
        <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
          <Award className="w-5 h-5 text-amber-700" />
          <div className="text-sm">
            <span className="font-medium">New badge{newBadges.length > 1 ? 's' : ''} unlocked:</span>{' '}
            {newBadges.map((b, i) => (
              <span key={b}>
                <Badge tone="amber" className="ml-1">
                  {b}
                </Badge>
                {i < newBadges.length - 1 ? ' ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {submission.answers.map((a, idx) => {
          const q = assignment.questions.find((qq) => qq.id === a.questionId);
          if (!q) return null;
          const isMcq = a.type === 'MCQ';
          return (
            <div key={a.questionId} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm">
                  <span className="text-xs uppercase tracking-wide font-semibold text-brand-700">
                    Q{idx + 1} • {a.type}
                  </span>
                  <p className="font-medium text-slate-900 mt-0.5">{q.prompt}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isMcq ? (
                    a.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )
                  ) : null}
                  <Badge tone={a.score >= 75 ? 'green' : a.score >= 50 ? 'amber' : 'red'}>
                    {a.pointsAwarded}/{q.points}
                  </Badge>
                </div>
              </div>
              {a.feedback && (
                <p className="mt-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <span className="font-medium">AI feedback:</span> {a.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {onRetry && (
        <div className="text-right">
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
