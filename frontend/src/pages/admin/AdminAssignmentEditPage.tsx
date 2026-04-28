import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import type { AdminQuestion, ArticleListItem, AssignmentAdmin } from '@/types/api';

interface DraftQuestion {
  id?: string;
  type: 'MCQ' | 'SHORT';
  prompt: string;
  points: number;
  order: number;
  options: string[];
  correctIndex: number;
  modelAnswer: string;
  rubric: string;
  maxWords: string;
}

function fromAdminQuestion(q: AdminQuestion): DraftQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    order: q.order,
    options: q.options.length ? q.options : ['', ''],
    correctIndex: q.correctIndex ?? 0,
    modelAnswer: q.modelAnswer ?? '',
    rubric: q.rubric ?? '',
    maxWords: q.maxWords?.toString() ?? '',
  };
}

function newDraft(type: 'MCQ' | 'SHORT', order: number): DraftQuestion {
  return {
    type,
    prompt: '',
    points: 10,
    order,
    options: type === 'MCQ' ? ['', ''] : [],
    correctIndex: 0,
    modelAnswer: '',
    rubric: '',
    maxWords: '',
  };
}

export function AdminAssignmentEditPage(): JSX.Element {
  const { articleId } = useParams<{ articleId: string }>();
  const toast = useToast();
  const [title, setTitle] = useState('Practice');
  const [passingScore, setPassingScore] = useState(60);
  const [draft, setDraft] = useState<DraftQuestion[]>([]);

  // ---- Load article + assignment chain ----
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // 1. Find the article (so we can show its title in the header).
        const list = await api.articles.list({ limit: 200 });
        const article: ArticleListItem | undefined = list.items.find((a) => a.id === articleId);
        if (alive) setArticleTitle(article?.title ?? null);

        // 2. Check if a learner-facing assignment already exists for this article.
        const publicAssignment = await api.assignments.getForArticle(articleId);

        if (publicAssignment?.id) {
          // 3. Fetch the admin (full, with answer keys) version and hydrate the form.
          const admin: AssignmentAdmin = await api.assignments.getAdmin(publicAssignment.id);
          if (alive) {
            setTitle(admin.title);
            setPassingScore(admin.passingScore);
            setDraft(admin.questions.map(fromAdminQuestion));
          }
        } else if (alive) {
          // No assignment yet — pre-fill with a sensible default title.
          setTitle(`${article?.title ?? ''} – Practice`);
          setDraft([]);
        }
      } catch (err) {
        toast.error('Could not load assignment', extractError(err).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [articleId, toast]);

  // ---- Save handler ----
  const handleSave = async () => {
    if (!articleId) return;
    setSaving(true);
    try {
      const questions = draft.map((q, idx) => {
        if (q.type === 'MCQ') {
          return {
            ...(q.id ? { id: q.id } : {}),
            type: 'MCQ' as const,
            prompt: q.prompt.trim(),
            points: Number(q.points) || 10,
            order: idx,
            options: q.options.map((o) => o.trim()).filter(Boolean),
            correctIndex: q.correctIndex,
          };
        }
        return {
          ...(q.id ? { id: q.id } : {}),
          type: 'SHORT' as const,
          prompt: q.prompt.trim(),
          points: Number(q.points) || 10,
          order: idx,
          modelAnswer: q.modelAnswer.trim(),
          rubric: q.rubric.trim() || undefined,
          maxWords: q.maxWords ? Number(q.maxWords) : undefined,
        };
      });
      await api.assignments.upsertForArticle(articleId, {
        title: title.trim() || 'Practice',
        passingScore,
        questions,
      });
      toast.success('Assignment saved');
    } catch (err) {
      toast.error('Save failed', extractError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const updateQ = (idx: number, patch: Partial<DraftQuestion>) =>
    setDraft((d) => d.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const removeQ = (idx: number) => setDraft((d) => d.filter((_, i) => i !== idx));

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/articles" className="text-sm text-slate-500 hover:text-brand-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to articles
      </Link>
      <h2 className="text-xl font-bold">Assignment for: {articleTitle ?? '—'}</h2>

      <div className="card p-4 grid sm:grid-cols-2 gap-3">
        <Input label="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Passing score (%)"
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={(e) => setPassingScore(Number(e.target.value) || 0)}
        />
      </div>

      <div className="space-y-3">
        {draft.map((q, idx) => (
          <div key={idx} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">
                Q{idx + 1} <span className="text-xs uppercase tracking-wide text-brand-700 ml-2">{q.type}</span>
              </div>
              <button
                type="button"
                onClick={() => removeQ(idx)}
                className="text-red-600 hover:bg-red-50 rounded-md p-1"
                title="Remove question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Textarea
              label="Prompt"
              value={q.prompt}
              onChange={(e) => updateQ(idx, { prompt: e.target.value })}
              rows={2}
            />
            <Input
              label="Points"
              type="number"
              min={1}
              max={100}
              value={q.points}
              onChange={(e) => updateQ(idx, { points: Number(e.target.value) || 1 })}
            />

            {q.type === 'MCQ' ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Options</p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${idx}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQ(idx, { correctIndex: oi })}
                      className="accent-brand-600"
                      title="Mark as correct"
                    />
                    <Input
                      value={opt}
                      onChange={(e) =>
                        updateQ(idx, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })
                      }
                      placeholder={`Option ${oi + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateQ(idx, {
                          options: q.options.filter((_, i) => i !== oi),
                          correctIndex: Math.max(0, Math.min(q.correctIndex, q.options.length - 2)),
                        })
                      }
                      className="text-slate-400 hover:text-red-600"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => updateQ(idx, { options: [...q.options, ''] })}
                  disabled={q.options.length >= 6}
                >
                  <Plus className="w-3 h-3" /> Add option
                </button>
              </div>
            ) : (
              <>
                <Textarea
                  label="Model answer (private)"
                  value={q.modelAnswer}
                  onChange={(e) => updateQ(idx, { modelAnswer: e.target.value })}
                  rows={3}
                  hint="Used by the AI grader and is never shown to learners."
                />
                <Textarea
                  label="Rubric (optional)"
                  value={q.rubric}
                  onChange={(e) => updateQ(idx, { rubric: e.target.value })}
                  rows={2}
                />
                <Input
                  label="Max words (optional)"
                  type="number"
                  min={10}
                  max={2000}
                  value={q.maxWords}
                  onChange={(e) => updateQ(idx, { maxWords: e.target.value })}
                />
              </>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDraft((d) => [...d, newDraft('MCQ', d.length)])}
            icon={<Plus className="w-4 h-4" />}
          >
            Add MCQ
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDraft((d) => [...d, newDraft('SHORT', d.length)])}
            icon={<Plus className="w-4 h-4" />}
          >
            Add short answer
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          loading={saving}
          disabled={draft.length === 0}
          onClick={handleSave}
          icon={<Save className="w-4 h-4" />}
        >
          Save assignment
        </Button>
      </div>
    </div>
  );
}
