import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * Each row of the leaderboard.
 * `compositeScore = avgScore * 0.7 + completionRate * 0.3` — this is what
 * the leaderboard sorts by.
 */
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

/**
 * Run the leaderboard aggregation pipeline.
 * Exported so submission.controller can call it after a new submission
 * (to broadcast the fresh top-N over Socket.io).
 *
 * `limit = 0` means "no limit, return everyone" — used by myRank().
 */
export async function computeLeaderboardTop(limit = 20): Promise<LeaderboardEntry[]> {
  const pipeline: unknown[] = [
    // 1. Sort newest-first per (user, article) and keep only the latest
    //    submission for each pair, so retries don't double-count.
    { $sort: { userId: 1, articleId: 1, createdAt: -1 } },
    {
      $group: {
        _id: { userId: '$userId', articleId: '$articleId' },
        latest: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$latest' } },

    // 2. Group by user: average score + how many distinct articles they've done.
    {
      $group: {
        _id: '$userId',
        avgScore: { $avg: '$percentage' },
        submittedArticles: { $addToSet: '$articleId' },
        totalSubmissions: { $sum: 1 },
      },
    },

    // 3. Look up how many published articles exist (for completion %).
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

    // 4. Completion rate = (articles attempted / total articles) * 100
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

    // 5. Composite score = 70% avg accuracy + 30% completion
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

  // 6. Look up user details for display.
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

/** GET /api/leaderboard — top N entries. */
export async function top(req: Request, res: Response): Promise<void> {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const data = await computeLeaderboardTop(limit);
  res.json({ ok: true, data });
}

/**
 * GET /api/leaderboard/me/rank — current user's rank + the people just
 * above and below them (for "you and your neighbours" UI bits).
 */
export async function myRank(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();

  // No limit — we need the full ranked list to find this user's position.
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
