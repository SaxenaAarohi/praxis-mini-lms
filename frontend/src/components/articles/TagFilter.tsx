import { Tag } from '@/components/ui/Tag';

interface Props {
  tags: Array<{ tag: string; count: number }>;
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, activeTag, onSelect }: Props): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={
          'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
          (activeTag === null
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100')
        }
      >
        All
      </button>
      {tags.map((t) => (
        <Tag
          key={t.tag}
          label={t.tag}
          count={t.count}
          active={activeTag === t.tag}
          onClick={() => onSelect(activeTag === t.tag ? null : t.tag)}
        />
      ))}
    </div>
  );
}
