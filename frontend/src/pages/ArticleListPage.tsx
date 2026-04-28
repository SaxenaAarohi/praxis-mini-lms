import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { TagFilter } from '@/components/articles/TagFilter';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';

export function ArticleListPage(): JSX.Element {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const tagsQuery = useQuery({ queryKey: ['articles', 'tags'], queryFn: () => api.articles.tags() });

  const articlesQuery = useQuery({
    queryKey: ['articles', { tag: activeTag, q: debouncedQ }],
    queryFn: () =>
      api.articles.list({
        tag: activeTag ?? undefined,
        q: debouncedQ || undefined,
        limit: 30,
      }),
  });

  const items = useMemo(() => articlesQuery.data?.items ?? [], [articlesQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Articles</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pick a topic, read, then practice with the inline assignment.
          </p>
        </div>
        <div className="w-full md:w-80">
          <Input
            placeholder="Search title or content…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            trailing={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {tagsQuery.isLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      ) : tagsQuery.data && tagsQuery.data.length > 0 ? (
        <TagFilter tags={tagsQuery.data} activeTag={activeTag} onSelect={setActiveTag} />
      ) : null}

      {articlesQuery.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : articlesQuery.isError ? (
        <EmptyState title="Couldn't load articles" description="Please try again later." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No articles match your filters"
          description="Try clearing the tag or search to see all available articles."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
