import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  badges: string[];
  avgScore: number;
  completionRate: number;
  compositeScore: number;
  totalSubmissions: number;
}

interface RawRow {
  _id: { $oid: string } | string;
  name: string;
  avatarUrl: string | null;
  badges: string[];
  avgScore: number;
  completionRate: number;
  compositeScore: number;
  totalSubmissions: number;
}

const oidToString = (v: { $oid: string } | string): string =>
  typeof v === 'string' ? v : v.$oid;

export async function computeLeaderboardTop(limit = 20): Promise<LeaderboardEntry[]> {
  const pipeline: unknown[] = [

    { $sort: { userId: 1, articleId: 1, createdAt: -1 } },
    {
      $group: {
        _id: { userId: '$userId', articleId: '$articleId' },
        latest: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$latest' } },

    {
      $group: {
        _id: '$userId',
        avgScore: { $avg: '$percentage' },
        submittedArticles: { $addToSet: '$articleId' },
        totalSubmissions: { $sum: 1 },
      },
    },

    {
      $lookup: {
        from: 'Article',
        pipeline: [{ $match: { published: true } }, { $count: 'n' }],
        as: '_articlesTotal',
      },
    },
    {
      $addFields: {
        articlesTotal: { $ifNull: [{ $arrayElemAt: ['$_articlesTotal.n', 0] }, 0] },
      },
    },

    {
      $addFields: {
        completionRate: {
          $cond: [
            { $gt: ['$articlesTotal', 0] },
            {
              $multiply: [
                { $divide: [{ $size: '$submittedArticles' }, '$articlesTotal'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },

    {
      $addFields: {
        compositeScore: {
          $add: [
            { $multiply: ['$avgScore', 0.7] },
            { $multiply: ['$completionRate', 0.3] },
          ],
        },
      },
    },
    { $sort: { compositeScore: -1, avgScore: -1 } },
  ];

  if (limit > 0) pipeline.push({ $limit: limit });

  pipeline.push(
    { $lookup: { from: 'User', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        name: '$user.name',
        avatarUrl: '$user.avatarUrl',
        badges: '$user.gamification.badges',
        avgScore: { $round: ['$avgScore', 1] },
        completionRate: { $round: ['$completionRate', 1] },
        compositeScore: { $round: ['$compositeScore', 1] },
        totalSubmissions: 1,
      },
    },
  );

  const rows = (await prisma.submission.aggregateRaw({
    pipeline: pipeline as Prisma.InputJsonValue[],
  })) as unknown as RawRow[];

  return rows.map((r) => ({
    userId: oidToString(r._id),
    name: r.name,
    avatarUrl: r.avatarUrl ?? null,
    badges: r.badges ?? [],
    avgScore: Number(r.avgScore) || 0,
    completionRate: Number(r.completionRate) || 0,
    compositeScore: Number(r.compositeScore) || 0,
    totalSubmissions: Number(r.totalSubmissions) || 0,
  }));
}

export async function top(req: Request, res: Response): Promise<void> {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const data = await computeLeaderboardTop(limit);
  res.json({ ok: true, data });
}

export async function myRank(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();

  const all = await computeLeaderboardTop(0);
  const total = all.length;
  const idx = all.findIndex((e) => e.userId === req.user!.id);

  if (idx === -1) {
    res.json({ ok: true, data: { rank: null, total, entry: null, neighbors: [] } });
    return;
  }

  const start = Math.max(0, idx - 2);
  const end = Math.min(all.length, idx + 3);
  const neighbors = all.slice(start, end).map((e, i) => ({ ...e, rank: start + i + 1 }));

  res.json({
    ok: true,
    data: { rank: idx + 1, total, entry: all[idx], neighbors },
  });
}
