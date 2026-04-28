import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { estimateReadTime, slugify } from '../utils/slugify';
import { parsePaging } from '../utils/pagination';

/** Find a slug not already taken by another article. */
async function makeUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'article';
  let candidate = base;
  let i = 2;
  while (true) {
    const found = await prisma.article.findUnique({ where: { slug: candidate } });
    if (!found || found.id === excludeId) return candidate;
    candidate = `${base}-${i}`;
    i += 1;
  }
}

/** GET /api/articles — list with optional tag/search filter + pagination. */
export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as { tag?: string; q?: string; page?: string; limit?: string; sort?: string };
  const { page, limit, skip } = parsePaging(query);

  // Build a Prisma where filter from the optional query params
  const where: Prisma.ArticleWhereInput = {
    published: true,
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { content: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ArticleOrderByWithRelationInput =
    query.sort === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' };

  // Run the page query and the total count in parallel
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        tags: true,
        coverImageUrl: true,
        viewCount: true,
        estimatedReadTime: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  res.json({
    ok: true,
    data: { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** GET /api/articles/tags — distinct tag list with how many articles use each. */
export async function tags(_req: Request, res: Response): Promise<void> {
  const result = (await prisma.article.aggregateRaw({
    pipeline: [
      { $match: { published: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ],
  })) as unknown as Array<{ _id: string; count: number }>;

  res.json({ ok: true, data: result.map((r) => ({ tag: r._id, count: r.count })) });
}

/** GET /api/articles/:slug — fetch one article and the user's reading progress. */
export async function getBySlug(req: Request, res: Response): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { slug: req.params.slug },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!article) throw ApiError.notFound('Article not found');

  // Bump view count in the background — don't block the response.
  prisma.article
    .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  // Pull the user's saved scroll progress (0 if they haven't read it yet).
  let progress = 0;
  if (req.user) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    progress = user?.readingProgress.find((p) => p.articleId === article.id)?.percent ?? 0;
  }

  res.json({ ok: true, data: { ...article, readingProgress: progress } });
}

/** POST /api/articles — admin only. Auto-generates slug + read time. */
export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const input = req.body as {
    title: string;
    content: string;
    summary?: string;
    tags: string[];
    coverImageUrl?: string | null;
    published?: boolean;
  };

  const slug = await makeUniqueSlug(input.title);

  const article = await prisma.article.create({
    data: {
      title: input.title,
      slug,
      content: input.content,
      summary: input.summary,
      tags: input.tags,
      coverImageUrl: input.coverImageUrl ?? undefined,
      published: input.published ?? true,
      authorId: req.user.id,
      estimatedReadTime: estimateReadTime(input.content),
    },
  });

  res.status(201).json({ ok: true, data: article });
}

/** PATCH /api/articles/:id — admin only. Re-slugs if title changes. */
export async function update(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const input = req.body as Partial<{
    title: string;
    content: string;
    summary: string;
    tags: string[];
    coverImageUrl: string | null;
    published: boolean;
  }>;

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Article not found');

  // If the title changed, regenerate a unique slug
  let slug = existing.slug;
  if (input.title && input.title !== existing.title) {
    slug = await makeUniqueSlug(input.title, id);
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.published !== undefined ? { published: input.published } : {}),
      slug,
      ...(input.content !== undefined ? { estimatedReadTime: estimateReadTime(input.content) } : {}),
    },
  });

  res.json({ ok: true, data: article });
}

/** DELETE /api/articles/:id — admin only. Removes the assignment too. */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Article not found');

  // Schema's onDelete: Cascade handles the assignment; old submissions are kept.
  await prisma.assignment.deleteMany({ where: { articleId: id } });
  await prisma.article.delete({ where: { id } });

  res.status(204).send();
}

/** POST /api/articles/:id/progress — save the user's scroll % for an article. */
export async function setProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const articleId = req.params.id;
  const { percent } = req.body as { percent: number };

  // Make sure the article exists.
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  // Read the user, find or create their entry for this article, save back.
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.notFound('User not found');

  const updated = [...user.readingProgress];
  const idx = updated.findIndex((p) => p.articleId === articleId);
  if (idx >= 0) updated[idx] = { articleId, percent };
  else updated.push({ articleId, percent });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { readingProgress: updated },
  });

  res.json({ ok: true, data: { articleId, percent } });
}
