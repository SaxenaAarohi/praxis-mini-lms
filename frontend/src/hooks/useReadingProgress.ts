import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export function useReadingProgress(
  articleId: string | null,
  initial = 0,
  persistDelayMs = 1500,
): { percent: number; ref: (node: HTMLElement | null) => void } {
  const [percent, setPercent] = useState(initial);
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPercent(initial);
  }, [initial, articleId]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handler = () => {
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = Math.max(1, rect.height - viewport);
      const scrolled = Math.max(0, viewport - rect.top);
      const ratio = Math.min(1, Math.max(0, scrolled / total));
      const next = Math.round(ratio * 100);
      setPercent((prev) => (next > prev ? next : prev));
    };

    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (percent <= 0) return;
    timerRef.current = window.setTimeout(() => {
      api.articles.setProgress(articleId, percent).catch(() => undefined);
    }, persistDelayMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [percent, articleId, persistDelayMs]);

  const ref = (node: HTMLElement | null) => {
    containerRef.current = node;
  };

  return { percent, ref };
}
