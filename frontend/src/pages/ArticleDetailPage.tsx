import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Eye, ArrowLeft } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import type { Article, AssignmentPublic, Submission } from '@/types/api';
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

  const [article, setArticle] = useState<Article | null>(null);
  const [articleLoading, setArticleLoading] = useState(true);
  const [articleError, setArticleError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        setArticleLoading(true);
        const result = await api.articles.getBySlug(slug);
        if (alive) {
          setArticle(result);
          setArticleError(null);
        }
      } catch (err) {
        if (alive) setArticleError(extractError(err).message);
      } finally {
        if (alive) setArticleLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const articleId = article?.id ?? null;

  const [assignment, setAssignment] = useState<AssignmentPublic | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    (async () => {
      try {
        setAssignmentLoading(true);
        const result = await api.assignments.getForArticle(articleId);
        if (alive) setAssignment(result);
      } catch {
        if (alive) setAssignment(null);
      } finally {
        if (alive) setAssignmentLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [articleId]);

  const [resultData, setResultData] = useState<{
    submission: Submission;
    newBadges: string[];
  } | null>(null);

  useEffect(() => {
    if (!articleId) return;
    let alive = true;
    (async () => {
      try {
        const last = await api.submissions.latestForArticle(articleId);
        if (alive && last) setResultData({ submission: last, newBadges: [] });
      } catch {
        
      }
    })();
    return () => {
      alive = false;
    };
  }, [articleId]);

  const { percent: readPercent, ref: contentRef } = useReadingProgress(
    articleId,
    article?.readingProgress ?? 0,
  );

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (answers: SubmittedAnswer[]) => {
    if (!articleId) return;
    setSubmitting(true);
    try {
      const result = await api.submissions.create({ articleId, answers });
      setResultData({ submission: result.submission, newBadges: result.meta.newBadges });
      toast.success('Submitted!', `You scored ${result.submission.percentage.toFixed(1)}%.`);
    } catch (err) {
      toast.error('Submission failed', extractError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (articleLoading) {
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
  if (articleError || !article) {
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

        {assignmentLoading ? (
          <div className="card p-6 flex items-center justify-center">
            <Spinner />
          </div>
        ) : !assignment ? (
          <EmptyState
            title="No assignment yet"
            description="The author hasn't added practice questions for this article."
          />
        ) : resultData ? (
          <ResultPanel
            submission={resultData.submission}
            assignment={assignment}
            newBadges={resultData.newBadges}
            onRetry={() => setResultData(null)}
          />
        ) : (
          <AssignmentForm
            assignment={assignment}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </section>
    </div>
  );
}
