import { z } from 'zod';

export const summarizeSchema = z.object({
  articleId: z.string().min(1),
  refresh: z.boolean().optional(),
});

export const hintSchema = z.object({
  articleId: z.string().min(1),
  questionId: z.string().min(1),
  draft: z.string().max(2_000).optional(),
});

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().min(1).max(4_000),
      }),
    )
    .min(1)
    .max(20),
});

export type SummarizeInput = z.infer<typeof summarizeSchema>;
export type HintInput = z.infer<typeof hintSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
