import type { Request, Response } from 'express';
import * as articleService from '../services/article.service';
import { ApiError } from '../utils/ApiError';

export async function list(req: Request, res: Response): Promise<void> {
  const result = await articleService.listArticles(req.query as never);
  res.json({ ok: true, data: result });
}

export async function tags(_req: Request, res: Response): Promise<void> {
  const data = await articleService.listAllTags();
  res.json({ ok: true, data });
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const article = await articleService.getArticleBySlug(req.params.slug, { incrementView: true });
  let progress = 0;
  if (req.user) {
    progress = (await articleService.getReadingProgress(req.user.id, article.id)).percent;
  }
  res.json({ ok: true, data: { ...article, readingProgress: progress } });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const article = await articleService.createArticle(req.user.id, req.body);
  res.status(201).json({ ok: true, data: article });
}

export async function update(req: Request, res: Response): Promise<void> {
  const article = await articleService.updateArticle(req.params.id, req.body);
  res.json({ ok: true, data: article });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await articleService.deleteArticle(req.params.id);
  res.status(204).send();
}

export async function setProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const { percent } = req.body as { percent: number };
  const data = await articleService.setReadingProgress(req.user.id, req.params.id, percent);
  res.json({ ok: true, data });
}
