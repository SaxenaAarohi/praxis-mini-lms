import { Link } from 'react-router-dom';
import { Clock, Eye } from 'lucide-react';
import type { ArticleListItem } from '@/types/api';
import { Tag } from '@/components/ui/Tag';
import { dateLabel, truncate } from '@/lib/format';

export function ArticleCard({ article }: { article: ArticleListItem }): JSX.Element {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="card p-5 hover:shadow-md hover:border-brand-200 transition-all flex flex-col gap-3 group"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {article.tags.slice(0, 3).map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
        {article.title}
      </h3>
      {article.summary && (
        <p className="text-sm text-slate-600 line-clamp-3">{truncate(article.summary, 220)}</p>
      )}
      <div className="mt-auto flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {article.estimatedReadTime} min read
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {article.viewCount}
        </span>
        <span className="ml-auto">{dateLabel(article.createdAt)}</span>
      </div>
    </Link>
  );
}
