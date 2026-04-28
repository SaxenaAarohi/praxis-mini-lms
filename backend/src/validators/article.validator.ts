import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().min(20, 'Content must be at least 20 characters').max(50_000),
  summary: z.string().max(2_000).optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).min(1).max(10),
  coverImageUrl: z.string().url().optional().nullable(),
  published: z.boolean().optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export const listArticlesQuerySchema = z.object({
  tag: z.string().trim().toLowerCase().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sort: z.enum(['recent', 'popular']).optional().default('recent'),
});

export const progressSchema = z.object({
  percent: z.coerce.number().int().min(0).max(100),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
