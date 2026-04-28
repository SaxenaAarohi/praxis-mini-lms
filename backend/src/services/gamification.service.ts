import { Submission, User } from '@prisma/client';
import { prisma } from '../config/prisma';

export const BADGES = {
  FIRST_SUBMISSION: 'first-submission',
  PERFECT_SCORE: 'perfect-score',
  STREAK_3: 'streak-3',
  STREAK_7: 'streak-7',
  POLYGLOT: 'polyglot',
  TOP_10: 'top-10',
} as const;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isYesterday(prev: Date, today: Date): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return today.getTime() - prev.getTime() < oneDayMs * 2 && !isSameDay(prev, today);
}

export interface SubmissionEffect {
  newBadges: string[];
  streak: number;
  totalPoints: number;
}

export async function applySubmissionEffects(
  user: User,
  submission: Submission,
): Promise<SubmissionEffect> {
  const now = new Date();
  const last = user.gamification.lastActivityAt;

  let streak = user.gamification.streak;
  if (!last) streak = 1;
  else if (isSameDay(last, now)) {
    // same day — no change
  } else if (isYesterday(last, now)) {
    streak += 1;
  } else {
    streak = 1;
  }

  const existingBadges = new Set(user.gamification.badges);
  const newBadges: string[] = [];
  const add = (b: string) => {
    if (!existingBadges.has(b)) {
      existingBadges.add(b);
      newBadges.push(b);
    }
  };

  add(BADGES.FIRST_SUBMISSION);
  if (submission.percentage >= 100) add(BADGES.PERFECT_SCORE);
  if (streak >= 3) add(BADGES.STREAK_3);
  if (streak >= 7) add(BADGES.STREAK_7);

  // POLYGLOT: submitted across >= 5 distinct tags
  const distinctTags = await countDistinctTagsForUser(user.id);
  if (distinctTags >= 5) add(BADGES.POLYGLOT);

  // Recompute denormalized stats
  const allSubs = await prisma.submission.findMany({
    where: { userId: user.id },
    select: { percentage: true },
  });
  const attempted = allSubs.length;
  const passed = allSubs.filter((s) => s.percentage >= 60).length;
  const avgScore = attempted ? allSubs.reduce((sum, s) => sum + s.percentage, 0) / attempted : 0;
  const totalPoints = user.gamification.totalPoints + submission.totalPoints;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      gamification: {
        badges: Array.from(existingBadges),
        streak,
        lastActivityAt: now,
        totalPoints,
      },
      stats: {
        assignmentsAttempted: attempted,
        assignmentsPassed: passed,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    },
  });

  return { newBadges, streak, totalPoints };
}

async function countDistinctTagsForUser(userId: string): Promise<number> {
  const rows = (await prisma.submission.aggregateRaw({
    pipeline: [
      // userId is stored as ObjectId in MongoDB; aggregateRaw expects raw shape.
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
      { $group: { _id: '$article.tags' } },
      { $count: 'n' },
    ],
  })) as unknown as Array<{ n: number }>;

  return rows[0]?.n ?? 0;
}
