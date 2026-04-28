import slugifyLib from 'slugify';

export function slugify(value: string): string {
  return slugifyLib(value, { lower: true, strict: true, trim: true });
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  const baseSlug = slugify(base) || 'article';
  if (!existing.has(baseSlug)) return baseSlug;
  let i = 2;
  while (existing.has(`${baseSlug}-${i}`)) i += 1;
  return `${baseSlug}-${i}`;
}

export function estimateReadTime(content: string, wordsPerMinute = 200): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
