import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import type { ArticleListItem } from '@/types/api';
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
  const qc = useQueryClient();
  const [preview, setPreview] = useState(false);

  const articleQuery = useQuery({
    queryKey: ['admin', 'article', id],
    queryFn: async () => {
      // We don't have a direct getById endpoint as an admin, but list returns enough by filtering;
      // instead resolve from the list endpoint by id.
      const res = await api.articles.list({ limit: 200 });
      return res.items.find((x: ArticleListItem) => x.id === id) ?? null;
    },
    enabled: Boolean(id),
  });

  const fullArticleQuery = useQuery({
    queryKey: ['admin', 'article-full', id],
    queryFn: async () => {
      const slug = articleQuery.data?.slug;
      return slug ? api.articles.getBySlug(slug) : null;
    },
    enabled: Boolean(articleQuery.data?.slug),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
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
    if (fullArticleQuery.data) {
      reset({
        title: fullArticleQuery.data.title,
        content: fullArticleQuery.data.content,
        summary: fullArticleQuery.data.summary ?? '',
        tagsText: fullArticleQuery.data.tags.join(', '),
        coverImageUrl: fullArticleQuery.data.coverImageUrl ?? '',
        published: fullArticleQuery.data.published,
      });
    }
  }, [fullArticleQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
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
      if (isNew) return api.articles.create(payload);
      return api.articles.update(id!, payload);
    },
    onSuccess: (article) => {
      toast.success(isNew ? 'Article created' : 'Article saved');
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      if (isNew) navigate(`/admin/articles/${article.id}/assignment`);
    },
    onError: (err) => toast.error('Save failed', extractError(err).message),
  });

  const isLoading = !isNew && (articleQuery.isLoading || fullArticleQuery.isLoading);

  if (isLoading) {
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

      <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="grid lg:grid-cols-2 gap-4">
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
            <Button type="submit" loading={isSubmitting || saveMutation.isPending} icon={<Save className="w-4 h-4" />}>
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
