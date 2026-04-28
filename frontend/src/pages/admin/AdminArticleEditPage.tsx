import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import type { Article, ArticleListItem } from '@/types/api';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { MarkdownView } from '@/components/articles/MarkdownView';

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  summary: z.string().optional(),
  tagsText: z.string().min(1, 'Add at least one tag'),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  published: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export function AdminArticleEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [preview, setPreview] = useState(false);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew || !id) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        
        const list = await api.articles.list({ limit: 200 });
        const stub: ArticleListItem | undefined = list.items.find((x) => x.id === id);
        if (!stub || !alive) {
          if (alive) setArticle(null);
          return;
        }
        const full = await api.articles.getBySlug(stub.slug);
        if (alive) setArticle(full);
      } catch {
        if (alive) setArticle(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      summary: '',
      tagsText: '',
      coverImageUrl: '',
      published: true,
    },
  });

  useEffect(() => {
    if (article) {
      reset({
        title: article.title,
        content: article.content,
        summary: article.summary ?? '',
        tagsText: article.tags.join(', '),
        coverImageUrl: article.coverImageUrl ?? '',
        published: article.published,
      });
    }
  }, [article, reset]);

  const [saving, setSaving] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const tags = values.tagsText
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        title: values.title,
        content: values.content,
        summary: values.summary || undefined,
        tags,
        coverImageUrl: values.coverImageUrl || null,
        published: values.published,
      };
      const saved = isNew
        ? await api.articles.create(payload)
        : await api.articles.update(id!, payload);
      toast.success(isNew ? 'Article created' : 'Article saved');
      if (isNew) navigate(`/admin/articles/${saved.id}/assignment`);
    } catch (err) {
      toast.error('Save failed', extractError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const watchedTagsText = watch('tagsText');
  const watchedTags = (watchedTagsText ?? '').split(',').map((t) => t.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <Link to="/admin/articles" className="text-sm text-slate-500 hover:text-brand-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to articles
      </Link>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h2 className="text-xl font-bold">{isNew ? 'New article' : 'Edit article'}</h2>
        <div className="flex gap-2">
          {!isNew && id && (
            <Link to={`/admin/articles/${id}/assignment`} className="btn-secondary">
              <ClipboardList className="w-4 h-4" />
              Edit assignment
            </Link>
          )}
          <button type="button" className="btn-secondary" onClick={() => setPreview((v) => !v)}>
            {preview ? 'Hide preview' : 'Preview'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Input label="Title" placeholder="Closures in JavaScript" error={errors.title?.message} {...register('title')} />
          <Input
            label="Tags (comma-separated)"
            placeholder="javascript, fundamentals"
            error={errors.tagsText?.message}
            {...register('tagsText')}
          />
          {watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {watchedTags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}
          <Input
            label="Cover image URL (optional)"
            placeholder="https://…"
            error={errors.coverImageUrl?.message}
            {...register('coverImageUrl')}
          />
          <Textarea
            label="Short summary (optional)"
            rows={3}
            placeholder="One-paragraph synopsis…"
            {...register('summary')}
          />
          <Textarea
            label="Content (Markdown)"
            rows={18}
            placeholder="# Heading…"
            error={errors.content?.message}
            {...register('content')}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('published')} className="accent-brand-600" />
            Published
          </label>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
              {isNew ? 'Create article' : 'Save changes'}
            </Button>
          </div>
        </div>

        {preview && (
          <div className="card p-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Preview</p>
            <MarkdownView content={watch('content') ?? ''} />
          </div>
        )}
      </form>
    </div>
  );
}
