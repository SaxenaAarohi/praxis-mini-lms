import { Answer, QuestionType, Submission, SubmissionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { parsePaging } from '../utils/pagination';
import * as aiService from './ai.service';
import * as gamificationService from './gamification.service';
import * as leaderboardService from './leaderboard.service';
import { emitLeaderboardUpdated } from '../sockets/leaderboard.socket';
import type { CreateSubmissionInput } from '../validators/submission.validator';
import { logger } from '../config/logger';

interface GradeResultMeta {
  newBadges: string[];
  rank?: number;
}

export async function createSubmission(
  userId: string,
  input: CreateSubmissionInput,
): Promise<{ submission: Submission; meta: GradeResultMeta }> {
  const assignment = await prisma.assignment.findUnique({ where: { articleId: input.articleId } });
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
      const userIndex = (ans as { mcqIndex: number }).mcqIndex;
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
      const userText = (ans as { text: string }).text;
      const evalResult = await aiService.evaluateAnswer({
        question: q.prompt,
        modelAnswer: q.modelAnswer ?? '',
        rubric: q.rubric ?? undefined,
        userAnswer: userText,
      });
      const feedbackLooksFallback = /unavailable|pending review/i.test(evalResult.feedback);
      if (feedbackLooksFallback && evalResult.score === 0) aiAvailable = false;
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

  // Mark article reading progress as complete on a passing submission.
  if (percentage >= assignment.passingScore) {
    await markArticleComplete(userId, assignment.articleId).catch((err) =>
      logger.warn({ err }, 'failed to mark article complete'),
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  let meta: GradeResultMeta = { newBadges: [] };
  if (user) {
    const effect = await gamificationService.applySubmissionEffects(user, submission);
    meta = { newBadges: effect.newBadges };
  }

  // Real-time leaderboard refresh (fire-and-forget)
  void leaderboardService
    .computeTop(20)
    .then((top) => emitLeaderboardUpdated({ top }))
    .catch((err) => logger.warn({ err }, 'leaderboard emit failed'));

  return { submission, meta };
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

export async function listMySubmissions(userId: string, query: { page?: string | number; limit?: string | number }) {
  const { page, limit, skip } = parsePaging(query);
  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, slug: true, tags: true } } },
    }),
    prisma.submission.count({ where: { userId } }),
  ]);
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getMyLatestForArticle(userId: string, articleId: string) {
  return prisma.submission.findFirst({
    where: { userId, articleId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string, userId: string, isAdmin: boolean) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!submission) throw ApiError.notFound('Submission not found');
  if (!isAdmin && submission.userId !== userId) throw ApiError.forbidden();
  return submission;
}

export async function listRecentForAdmin(limit = 20) {
  return prisma.submission.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      article: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
