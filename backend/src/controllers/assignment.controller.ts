import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Question, QuestionType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

interface UpsertInput {
  title: string;
  passingScore?: number;
  questions: Array<
    | {
        id?: string;
        type: 'MCQ';
        prompt: string;
        points: number;
        order: number;
        options: string[];
        correctIndex: number;
      }
    | {
        id?: string;
        type: 'SHORT';
        prompt: string;
        points: number;
        order: number;
        modelAnswer: string;
        rubric?: string;
        maxWords?: number;
      }
  >;
}

function normalizeQuestions(input: UpsertInput['questions']): Question[] {
  return input.map((q, idx) => {
    const id = q.id || randomUUID();
    const order = q.order ?? idx;
    if (q.type === 'MCQ') {
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
      };
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
    };
  });
}

export async function getForArticle(req: Request, res: Response): Promise<void> {
  const articleId = req.params.articleId;
  const assignment = await prisma.assignment.findUnique({
    where: { articleId },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!assignment) {
    res.json({ ok: true, data: null });
    return;
  }

  const safeQuestions = assignment.questions
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
    }));

  res.json({ ok: true, data: { ...assignment, questions: safeQuestions } });
}

export async function upsertForArticle(req: Request, res: Response): Promise<void> {
  const articleId = req.params.articleId;
  const input = req.body as UpsertInput;

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw ApiError.notFound('Article not found');

  const questions = normalizeQuestions(input.questions);

  const existing = await prisma.assignment.findUnique({ where: { articleId } });
  const saved = existing
    ? await prisma.assignment.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          passingScore: input.passingScore ?? 60,
          questions: { set: questions },
        },
      })
    : await prisma.assignment.create({
        data: {
          articleId,
          title: input.title,
          passingScore: input.passingScore ?? 60,
          questions: { set: questions },
        },
      });

  res.status(201).json({ ok: true, data: saved });
}

export async function getAdmin(req: Request, res: Response): Promise<void> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  res.json({ ok: true, data: assignment });
}

export async function update(req: Request, res: Response): Promise<void> {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Assignment not found');

  const input = req.body as UpsertInput;
  const questions = normalizeQuestions(input.questions);

  const updated = await prisma.assignment.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      passingScore: input.passingScore ?? 60,
      questions: { set: questions },
    },
  });

  res.json({ ok: true, data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Assignment not found');
  await prisma.assignment.delete({ where: { id: existing.id } });
  res.status(204).send();
}
