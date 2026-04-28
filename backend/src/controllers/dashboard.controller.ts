import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface RawDateBucket {
  _id: { year: number; month: number; day: number };
  avgPercentage: number;
  count: number;
}

interface RawTagBucket {
  _id: string;
  avgPercentage: number;
  submissions: number;
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const userId = req.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  
  const [aggregate, recentActivity, scoreOverTimeRaw, tagBreakdownRaw] = await Promise.all([
    prisma.submission.aggregate({
      where: { userId },
      _count: { _all: true },
      _avg: { percentage: true },
    }),

    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        article: { select: { id: true, title: true, slug: true, tags: true } },
      },
    }),

    prisma.submission.aggregateRaw({
      pipeline: [
        { $match: { $expr: { $eq: ['$userId', { $oid: userId }] } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            avgPercentage: { $avg: '$percentage' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ],
    }) as Promise<unknown> as Promise<RawDateBucket[]>,

    prisma.submission.aggregateRaw({
      pipeline: [
        { $match: { $expr: { $eq: ['$userId', { $oid: userId }] } } },
        {
          $lookup: {
            from: 'Article',
            localField: 'articleId',
            foreignField: '_id',
            as: 'article',
          },
        },
        { $unwind: '$article' },
        { $unwind: '$article.tags' },
        {
          $group: {
            _id: '$article.tags',
            avgPercentage: { $avg: '$percentage' },
            submissions: { $sum: 1 },
          },
        },
        { $sort: { submissions: -1, _id: 1 } },
      ],
    }) as Promise<unknown> as Promise<RawTagBucket[]>,
  ]);

  
  const passedCount = await prisma.submission.count({
    where: { userId, percentage: { gte: 60 } },
  });
  const distinctArticles = await prisma.submission.findMany({
    where: { userId },
    distinct: ['articleId'],
    select: { articleId: true },
  });

  const scoreOverTime = scoreOverTimeRaw.map((b) => ({
    date: new Date(Date.UTC(b._id.year, b._id.month - 1, b._id.day)).toISOString().slice(0, 10),
    avgPercentage: Math.round(b.avgPercentage * 10) / 10,
    submissions: b.count,
  }));

  const tagBreakdown = tagBreakdownRaw.map((b) => ({
    tag: b._id,
    avgPercentage: Math.round(b.avgPercentage * 10) / 10,
    submissions: b.submissions,
  }));

  res.json({
    ok: true,
    data: {
      totals: {
        attempted: aggregate._count._all,
        avgPercentage: Math.round((aggregate._avg.percentage ?? 0) * 100) / 100,
        passed: passedCount,
        distinctArticles: distinctArticles.length,
      },
      recentActivity,
      scoreOverTime,
      tagBreakdown,
      gamification: user.gamification,
      stats: user.stats,
    },
  });
}

export async function admin(_req: Request, res: Response): Promise<void> {
  
  const [users, articles, submissions, topArticles, recentUsers, recentSubmissions] =
    await Promise.all([
      prisma.user.count(),
      prisma.article.count(),
      prisma.submission.count(),
      prisma.submission.groupBy({
        by: ['articleId'],
        _count: { _all: true },
        orderBy: { _count: { articleId: 'desc' } },
        take: 5,
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.submission.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          article: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

  const articleIds = topArticles.map((t) => t.articleId);
  const articleData = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, title: true, slug: true },
  });
  const articleMap = new Map(articleData.map((a) => [a.id, a]));

  res.json({
    ok: true,
    data: {
      totals: { users, articles, submissions },
      topArticles: topArticles.map((t) => ({
        ...articleMap.get(t.articleId),
        submissions: t._count._all,
      })),
      recentUsers,
      recentSubmissions,
    },
  });
}
