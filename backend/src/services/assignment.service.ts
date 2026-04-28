import { randomUUID } from 'crypto';
import { Assignment, Question, QuestionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import type { UpsertAssignmentInput } from '../validators/assignment.validator';

function normalizeQuestions(input: UpsertAssignmentInput['questions']): Question[] {
  return input.map((q, idx) => {
    const id = q.id || randomUUID();
    const order = q.order ?? idx;
    if (q.type === QuestionType.MCQ) {
      return {
        id,
        type: QuestionType.MCQ,
        prompt: q.prompt,
        points: q.points,
        order,
        options: q.options,
        correctIndex: q.correctIndex,
        modelAnswer: null,
        rubric: null,
        maxWords: null,
      } as Question;
    }
    return {
      id,
      type: QuestionType.SHORT,
      prompt: q.prompt,
      points: q.points,
      order,
      options: [],
      correctIndex: null,
      modelAnswer: q.modelAnswer,
      rubric: q.rubric ?? null,
      maxWords: q.maxWords ?? null,
    } as Question;
  });
}

export async function upsertAssignmentForArticle(
  articleId: string,
  input: UpsertAssignmentInput,
): Promise<Assignment> {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  const questions = normalizeQuestions(input.questions);

  const existing = await prisma.assignment.findUnique({ where: { articleId } });
  if (existing) {
    return prisma.assignment.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        passingScore: input.passingScore,
        questions: { set: questions },
      },
    });
  }

  return prisma.assignment.create({
    data: {
      articleId,
      title: input.title,
      passingScore: input.passingScore,
      questions: { set: questions },
    },
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Assignment not found');
  await prisma.assignment.delete({ where: { id } });
}

/** User-facing read: strips correctIndex and modelAnswer/rubric. */
export async function getAssignmentForArticle(articleId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { articleId },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!assignment) return null;

  return {
    ...assignment,
    questions: assignment.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        order: q.order,
        ...(q.type === QuestionType.MCQ ? { options: q.options } : {}),
        ...(q.type === QuestionType.SHORT && q.maxWords ? { maxWords: q.maxWords } : {}),
      })),
  };
}

/** Admin-facing read: full data. */
export async function getAssignmentByIdForAdmin(id: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  return assignment;
}

export async function getAssignmentInternal(articleId: string) {
  // Internal helper used by submission service — returns full questions including answer keys.
  const assignment = await prisma.assignment.findUnique({ where: { articleId } });
  if (!assignment) throw ApiError.notFound('Assignment not found for this article');
  return assignment;
}
