import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Eye, ArrowLeft } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import { MarkdownView } from '@/components/articles/MarkdownView';
import { ReadingProgressBar } from '@/components/articles/ReadingProgressBar';
import { SummaryButton } from '@/components/ai/SummaryButton';
import { Tag } from '@/components/ui/Tag';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AssignmentForm, type SubmittedAnswer } from '@/components/assignments/AssignmentForm';
import { ResultPanel } from '@/components/assignments/ResultPanel';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { dateLabel } from '@/lib/format';

export function ArticleDetailPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const qc = useQueryClient();

  const articleQuery = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.articles.getBySlug(slug ?? ''),
    enabled: Boolean(slug),
  });

  const article = articleQuery.data;
  const articleId = article?.id ?? null;

  const assignmentQuery = useQuery({
    queryKey: ['assignment', articleId],
    queryFn: () => api.assignments.getForArticle(articleId ?? ''),
    enabled: Boolean(articleId),
  });

  const lastSubmissionQuery = useQuery({
    queryKey: ['submission', 'latest', articleId],
    queryFn: () => api.submissions.latestForArticle(articleId ?? ''),
    enabled: Boolean(articleId),
  });

  const { percent: readPercent, ref: contentRef } = useReadingProgress(
    articleId,
    article?.readingProgress ?? 0,
  );

  const [resultData, setResultData] = useState<{
    submission: import('@/types/api').Submission;
    newBadges: string[];
  } | null>(
    () =>
      lastSubmissionQuery.data
        ? { submission: lastSubmissionQuery.data, newBadges: [] }
        : null,
  );

  // Sync once when data loads
  useMemo(() => {
    if (lastSubmissionQuery.data && !resultData) {
      setResultData({ submission: lastSubmissionQuery.data, newBadges: [] });
    }
  }, [lastSubmissionQuery.data, resultData]);

  const submitMutation = useMutation({
    mutationFn: async (answers: SubmittedAnswer[]) => {
      if (!articleId) throw new Error('No article');
      return api.submissions.create({ articleId, answers });
    },
    onSuccess: (result) => {
      setResultData({ submission: result.submission, newBadges: result.meta.newBadges });
      toast.success('Submitted!', `You scored ${result.submission.percentage.toFixed(1)}%.`);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err) => {
      toast.error('Submission failed', extractError(err).message);
    },
  });

  if (articleQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  if (articleQuery.isError || !article) {
    return <EmptyState title="Article not available" description="This article may have been removed." />;
  }

  return (
    <div className="space-y-8">
      <ReadingProgressBar percent={readPercent} />

      <div>
        <Link to="/articles" className="text-sm text-slate-500 hover:text-brand-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {article.tags.map((t: string) => (
            <Tag key={t} label={t} />
          ))}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{article.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>By {article.author?.name ?? 'Unknown'}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" /> {article.estimatedReadTime} min read
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-4 h-4" /> {article.viewCount}
          </span>
          <span>{dateLabel(article.createdAt)}</span>
        </div>
      </div>

      <SummaryButton articleId={article.id} initialSummary={article.summary} />

      <div ref={contentRef as never}>
        <MarkdownView content={article.content} />
      </div>

      <hr className="border-slate-200" />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Practice assignment</h2>
          <p className="text-sm text-slate-600 mt-1">
            Answer all questions and submit. Multiple-choice is graded instantly; short-answer responses are evaluated by our AI tutor.
          </p>
        </div>

        {assignmentQuery.isLoading ? (
          <div className="card p-6 flex items-center justify-center">
            <Spinner />
          </div>
        ) : !assignmentQuery.data ? (
          <EmptyState
            title="No assignment yet"
            description="The author hasn't added practice questions for this article."
          />
        ) : resultData ? (
          <ResultPanel
            submission={resultData.submission}
            assignment={assignmentQuery.data}
            newBadges={resultData.newBadges}
            onRetry={() => setResultData(null)}
          />
        ) : (
          <AssignmentForm
            assignment={assignmentQuery.data}
            submitting={submitMutation.isPending}
            onSubmit={async (answers) => {
              await submitMutation.mutateAsync(answers);
            }}
          />
        )}
      </section>
    </div>
  );
}
