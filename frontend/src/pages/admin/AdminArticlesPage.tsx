import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { api, extractError } from '@/lib/api';
import type { ArticleListItem } from '@/types/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tag } from '@/components/ui/Tag';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { dateLabel } from '@/lib/format';

export function AdminArticlesPage(): JSX.Element {
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Article list ----
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Reusable loader so we can call it again after a delete.
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.articles.list({ limit: 50 });
      setItems(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ---- Delete handler ----
  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await api.articles.remove(confirmId);
      toast.success('Article deleted');
      setConfirmId(null);
      await load();
    } catch (err) {
      toast.error('Could not delete', extractError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{total ?? '—'} articles published</p>
        <Link to="/admin/articles/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600 text-center">
          No articles yet — create your first one.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((a: ArticleListItem) => (
              <li key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/articles/${a.slug}`} className="font-semibold hover:text-brand-700 truncate block">
                    {a.title}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {dateLabel(a.createdAt)} · {a.viewCount} views · {a.estimatedReadTime} min
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.tags.map((t: string) => <Tag key={t} label={t} />)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/articles/${a.id}/edit`} className="btn-secondary" title="Edit article">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Link>
                  <Link to={`/admin/articles/${a.id}/assignment`} className="btn-secondary" title="Manage assignment">
                    <ClipboardList className="w-4 h-4" />
                    Assignment
                  </Link>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setConfirmId(a.id)}
                    title="Delete article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={Boolean(confirmId)} onClose={() => setConfirmId(null)} title="Delete article?">
        <p className="text-sm text-slate-600 mb-4">
          This will permanently remove the article and its assignment. Past submissions are preserved.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
