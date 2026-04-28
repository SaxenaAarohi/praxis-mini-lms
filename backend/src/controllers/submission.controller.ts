import type { Request, Response } from 'express';
import {
  Answer,
  Prisma,
  QuestionType,
  Role,
  Submission,
  SubmissionStatus,
  User,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { parsePaging } from '../utils/pagination';
import { callOpenRouter, clip, isAiEnabled } from '../utils/openrouter';
import { AI_LIMITS, AI_PROMPTS } from '../utils/ai-prompts';
import { computeLeaderboardTop } from './leaderboard.controller';
import { emitLeaderboardUpdated } from '../sockets/leaderboard.socket';

const BADGES = {
  FIRST_SUBMISSION: 'first-submission',
  PERFECT_SCORE: 'perfect-score',
  STREAK_3: 'streak-3',
  STREAK_7: 'streak-7',
  POLYGLOT: 'polyglot',
  TOP_10: 'top-10',
} as const;

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isYesterday(prev: Date, today: Date): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return today.getTime() - prev.getTime() < oneDayMs * 2 && !isSameUtcDay(prev, today);
}

async function countDistinctTagsForUser(userId: string): Promise<number> {
  const rows = (await prisma.submission.aggregateRaw({
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
      { $group: { _id: '$article.tags' } },
      { $count: 'n' },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

async function evaluateShortAnswer(input: {
  question: string;
  modelAnswer: string;
  rubric?: string | null;
  userAnswer: string;
}): Promise<{ score: number; feedback: string }> {
  if (!isAiEnabled) {
    
    const a = input.userAnswer.toLowerCase();
    const m = input.modelAnswer.toLowerCase();
    const tokens = m.split(/\W+/).filter((t) => t.length > 4).slice(0, 12);
    const matches = tokens.filter((t) => a.includes(t)).length;
    const ratio = tokens.length ? matches / tokens.length : 0;
    const score = Math.round(40 + ratio * 60);
    return {
      score: Math.min(100, Math.max(0, score)),
      feedback:
        score >= 75
          ? 'Good answer — covers most of the key points.'
          : score >= 50
            ? 'Partial answer. Re-read the article and add more detail.'
            : 'Answer is incomplete. Revisit the relevant section before retrying.',
    };
  }

  const prompt = AI_PROMPTS.evaluate({
    question: clip(input.question, AI_LIMITS.contentMaxChars),
    modelAnswer: clip(input.modelAnswer, AI_LIMITS.contentMaxChars),
    rubric: input.rubric ? clip(input.rubric, AI_LIMITS.contentMaxChars) : undefined,
    userAnswer: clip(input.userAnswer, AI_LIMITS.answerMaxChars),
  });

  try {
    const text = await callOpenRouter(
      [
        {
          role: 'system',
          content:
            'You are a strict grading assistant. Return ONLY a JSON object {"score": int 0-100, "feedback": string}. No prose, no code fences.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, jsonMode: true, maxTokens: 400 },
    );

    const parsed = parseJsonLoose(text) as { score?: unknown; feedback?: unknown } | null;
    if (!parsed) throw new Error('AI did not return valid JSON');

    const score = Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback ?? '').slice(0, 800) || 'No feedback returned.';
    return { score, feedback };
  } catch (err) {
    logger.error({ err }, 'AI evaluateShortAnswer failed');
    return {
      score: 0,
      feedback: 'Auto-evaluation is currently unavailable; this submission is pending review.',
    };
  }
}

function parseJsonLoose(text: string): unknown {
  if (!text) return null;
  try { return JSON.parse(text); } catch {  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {  }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {  }
  }
  return null;
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const userId = req.user.id;
  const input = req.body as {
    articleId: string;
    durationMs?: number;
    answers: Array<{
      questionId: string;
      type: 'MCQ' | 'SHORT';
      mcqIndex?: number;
      text?: string;
    }>;
  };

  const assignment = await prisma.assignment.findUnique({
    where: { articleId: input.articleId },
  });
  if (!assignment) throw ApiError.notFound('Assignment for this article does not exist');

  const questionMap = new Map(assignment.questions.map((q) => [q.id, q]));
  let aiUsed = false;
  let aiAvailable = true;

  const gradedAnswers: Answer[] = [];
  for (const ans of input.answers) {
    const q = questionMap.get(ans.questionId);
    if (!q) throw ApiError.badRequest(`Unknown questionId: ${ans.questionId}`);
    if (ans.type !== q.type) {
      throw ApiError.badRequest(`Answer type mismatch for question ${q.id}`);
    }

    if (q.type === QuestionType.MCQ) {
      const userIndex = ans.mcqIndex as number;
      const correct = q.correctIndex != null && userIndex === q.correctIndex;
      gradedAnswers.push({
        questionId: q.id,
        type: QuestionType.MCQ,
        mcqIndex: userIndex,
        text: null,
        score: correct ? 100 : 0,
        pointsAwarded: correct ? q.points : 0,
        feedback: null,
        isCorrect: correct,
      });
    } else {
      
      aiUsed = true;
      const userText = ans.text as string;
      const evalResult = await evaluateShortAnswer({
        question: q.prompt,
        modelAnswer: q.modelAnswer ?? '',
        rubric: q.rubric,
        userAnswer: userText,
      });

      
      if (/unavailable|pending review/i.test(evalResult.feedback) && evalResult.score === 0) {
        aiAvailable = false;
      }

      gradedAnswers.push({
        questionId: q.id,
        type: QuestionType.SHORT,
        mcqIndex: null,
        text: userText,
        score: evalResult.score,
        pointsAwarded: Math.round((q.points * evalResult.score) / 100),
        feedback: evalResult.feedback,
        isCorrect: null,
      });
    }
  }

  const totalPoints = gradedAnswers.reduce((s, a) => s + a.pointsAwarded, 0);
  const maxPoints = assignment.questions.reduce((s, q) => s + q.points, 0);
  const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 1000) / 10 : 0;

  const submission = await prisma.submission.create({
    data: {
      userId,
      articleId: assignment.articleId,
      assignmentId: assignment.id,
      answers: { set: gradedAnswers },
      totalPoints,
      maxPoints,
      percentage,
      status: aiAvailable ? SubmissionStatus.GRADED : SubmissionStatus.PENDING,
      aiUsed,
      durationMs: input.durationMs,
    },
  });

  if (percentage >= assignment.passingScore) {
    await markArticleComplete(userId, assignment.articleId).catch((err) =>
      logger.warn({ err }, 'failed to mark article complete'),
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  let newBadges: string[] = [];
  if (user) {
    newBadges = await applySubmissionEffects(user, submission);
  }

  void computeLeaderboardTop(20)
    .then((top) => emitLeaderboardUpdated({ top }))
    .catch((err) => logger.warn({ err }, 'leaderboard emit failed'));

  res.status(201).json({ ok: true, data: { submission, meta: { newBadges } } });
}

async function markArticleComplete(userId: string, articleId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const updated = [...user.readingProgress];
  const idx = updated.findIndex((p) => p.articleId === articleId);
  if (idx >= 0) updated[idx] = { articleId, percent: 100 };
  else updated.push({ articleId, percent: 100 });
  await prisma.user.update({ where: { id: userId }, data: { readingProgress: updated } });
}

async function applySubmissionEffects(user: User, submission: Submission): Promise<string[]> {
  const now = new Date();
  const last = user.gamification.lastActivityAt;

  let streak = user.gamification.streak;
  if (!last) streak = 1;
  else if (isSameUtcDay(last, now)) {
    
  } else if (isYesterday(last, now)) {
    streak += 1;
  } else {
    streak = 1;
  }

  const existingBadges = new Set(user.gamification.badges);
  const newBadges: string[] = [];
  const tryAdd = (b: string) => {
    if (!existingBadges.has(b)) {
      existingBadges.add(b);
      newBadges.push(b);
    }
  };

  tryAdd(BADGES.FIRST_SUBMISSION);
  if (submission.percentage >= 100) tryAdd(BADGES.PERFECT_SCORE);
  if (streak >= 3) tryAdd(BADGES.STREAK_3);
  if (streak >= 7) tryAdd(BADGES.STREAK_7);

  const distinctTags = await countDistinctTagsForUser(user.id);
  if (distinctTags >= 5) tryAdd(BADGES.POLYGLOT);

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

  return newBadges;
}

export async function listMine(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { page, limit, skip } = parsePaging(req.query as { page?: string; limit?: string });

  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, slug: true, tags: true } } },
    }),
    prisma.submission.count({ where: { userId: req.user.id } }),
  ]);

  res.json({
    ok: true,
    data: { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getMyLatestForArticle(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const submission = await prisma.submission.findFirst({
    where: { userId: req.user.id, articleId: req.params.articleId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ ok: true, data: submission });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!submission) throw ApiError.notFound('Submission not found');

  const isAdmin = req.user.role === Role.ADMIN;
  if (!isAdmin && submission.userId !== req.user.id) throw ApiError.forbidden();

  res.json({ ok: true, data: submission });
}

export async function adminRecent(_req: Request, res: Response): Promise<void> {
  const items = await prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      article: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  res.json({ ok: true, data: items });
}
