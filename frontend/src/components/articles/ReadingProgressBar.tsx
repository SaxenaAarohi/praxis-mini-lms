interface Props {
  percent: number;
}

export function ReadingProgressBar({ percent }: Props): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="sticky top-14 z-20 -mx-4 sm:-mx-6">
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-brand-500 transition-[width] duration-150"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
