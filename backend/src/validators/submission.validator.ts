import { z } from 'zod';
import { QuestionType } from '@prisma/client';

const mcqAnswer = z.object({
  questionId: z.string().min(1),
  type: z.literal(QuestionType.MCQ),
  mcqIndex: z.coerce.number().int().min(0),
});

const shortAnswer = z.object({
  questionId: z.string().min(1),
  type: z.literal(QuestionType.SHORT),
  text: z.string().trim().min(1).max(4_000),
});

export const createSubmissionSchema = z.object({
  articleId: z.string().min(1),
  durationMs: z.coerce.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  answers: z.array(z.discriminatedUnion('type', [mcqAnswer, shortAnswer])).min(1).max(50),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
