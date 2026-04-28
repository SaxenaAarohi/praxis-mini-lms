import { z } from 'zod';
import { QuestionType } from '@prisma/client';

const baseQuestion = z.object({
  id: z.string().optional(),
  prompt: z.string().trim().min(3).max(2_000),
  points: z.coerce.number().int().min(1).max(100).default(10),
  order: z.coerce.number().int().min(0).default(0),
});

const mcqQuestion = baseQuestion.extend({
  type: z.literal(QuestionType.MCQ),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0),
});

const shortQuestion = baseQuestion.extend({
  type: z.literal(QuestionType.SHORT),
  modelAnswer: z.string().trim().min(3).max(4_000),
  rubric: z.string().trim().max(2_000).optional(),
  maxWords: z.coerce.number().int().min(10).max(2_000).optional(),
});

export const questionSchema = z
  .discriminatedUnion('type', [mcqQuestion, shortQuestion])
  .superRefine((q, ctx) => {
    if (q.type === QuestionType.MCQ && q.correctIndex >= q.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctIndex'],
        message: 'correctIndex must be a valid option index',
      });
    }
  });

export const upsertAssignmentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  passingScore: z.coerce.number().int().min(0).max(100).default(60),
  questions: z.array(questionSchema).min(1).max(30),
});

export type UpsertAssignmentInput = z.infer<typeof upsertAssignmentSchema>;
