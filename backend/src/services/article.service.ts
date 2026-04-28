import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { estimateReadTime, slugify } from '../utils/slugify';
import type {
  CreateArticleInput,
  ListArticlesQuery,
  UpdateArticleInput,
} from '../validators/article.validator';
import { parsePaging } from '../utils/pagination';

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

export async function createArticle(authorId: string, input: CreateArticleInput) {
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
      authorId,
      estimatedReadTime: estimateReadTime(input.content),
    },
  });
  return article;
}

export async function updateArticle(id: string, input: UpdateArticleInput) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Article not found');

  let slug = existing.slug;
  if (input.title && input.title !== existing.title) {
    slug = await makeUniqueSlug(input.title, id);
  }

  const data: Prisma.ArticleUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
    slug,
    ...(input.content !== undefined ? { estimatedReadTime: estimateReadTime(input.content) } : {}),
  };

  return prisma.article.update({ where: { id }, data });
}

export async function deleteArticle(id: string) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Article not found');

  // Cascade: assignments are tied via onDelete:Cascade. Submissions remain (history).
  await prisma.assignment.deleteMany({ where: { articleId: id } });
  await prisma.article.delete({ where: { id } });
}

export async function listArticles(query: ListArticlesQuery) {
  const { page, limit, skip } = parsePaging(query);

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

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getArticleBySlug(slug: string, opts: { incrementView?: boolean } = {}) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true } },
    },
  });
  if (!article) throw ApiError.notFound('Article not found');

  if (opts.incrementView) {
    // Fire-and-forget; don't block the response on this.
    prisma.article
      .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
  }
  return article;
}

export async function getArticleById(id: string) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) throw ApiError.notFound('Article not found');
  return article;
}

export async function listAllTags() {
  // distinct tags with counts via aggregateRaw
  const result = (await prisma.article.aggregateRaw({
    pipeline: [
      { $match: { published: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ],
  })) as unknown as Array<{ _id: string; count: number }>;

  return result.map((r) => ({ tag: r._id, count: r.count }));
}

export async function setReadingProgress(userId: string, articleId: string, percent: number) {
  // Ensure article exists.
  await getArticleById(articleId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const updated = [...user.readingProgress];
  const idx = updated.findIndex((p) => p.articleId === articleId);
  if (idx >= 0) updated[idx] = { articleId, percent };
  else updated.push({ articleId, percent });

  await prisma.user.update({
    where: { id: userId },
    data: { readingProgress: updated },
  });

  return { articleId, percent };
}

export async function getReadingProgress(userId: string, articleId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  const entry = user.readingProgress.find((p) => p.articleId === articleId);
  return { articleId, percent: entry?.percent ?? 0 };
}
