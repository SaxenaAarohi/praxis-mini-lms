import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

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

interface RawLeaderboardRow {
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

function buildBasePipeline(limit?: number): unknown[] {
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
        articlesTotal: {
          $ifNull: [{ $arrayElemAt: ['$_articlesTotal.n', 0] }, 0],
        },
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

  if (typeof limit === 'number' && limit > 0) {
    pipeline.push({ $limit: limit });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'User',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
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

  return pipeline;
}

export async function computeTop(limit: number | undefined = 20): Promise<LeaderboardEntry[]> {
  const effectiveLimit = limit === 0 ? undefined : limit;
  const pipeline = buildBasePipeline(effectiveLimit);
  const rows = (await prisma.submission.aggregateRaw({
    pipeline: pipeline as Prisma.InputJsonValue[],
  })) as unknown as RawLeaderboardRow[];
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

export async function getRank(userId: string): Promise<{
  rank: number | null;
  total: number;
  entry: LeaderboardEntry | null;
  neighbors: Array<LeaderboardEntry & { rank: number }>;
}> {
  // Compute the full board (no limit) — fine for this assignment's scale.
  const all = await computeTop(0);
  const total = all.length;
  const idx = all.findIndex((e) => e.userId === userId);
  if (idx === -1) return { rank: null, total, entry: null, neighbors: [] };

  const rank = idx + 1;
  const start = Math.max(0, idx - 2);
  const end = Math.min(all.length, idx + 3);
  const neighbors = all.slice(start, end).map((e, i) => ({ ...e, rank: start + i + 1 }));
  return { rank, total, entry: all[idx], neighbors };
}
