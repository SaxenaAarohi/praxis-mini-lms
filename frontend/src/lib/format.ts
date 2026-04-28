import { formatDistanceToNow, format } from 'date-fns';

export function fromNow(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function dateLabel(value: string | Date): string {
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function shortDate(value: string | Date): string {
  try {
    return format(new Date(value), 'MMM d');
  } catch {
    return '—';
  }
}

export function pct(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits)}%`;
}

export function truncate(str: string, max = 160): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}
