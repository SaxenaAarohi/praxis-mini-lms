import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import * as submissionService from '../services/submission.service';
import { ApiError } from '../utils/ApiError';

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const result = await submissionService.createSubmission(req.user.id, req.body);
  res.status(201).json({ ok: true, data: result });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const result = await submissionService.listMySubmissions(req.user.id, req.query as never);
  res.json({ ok: true, data: result });
}

export async function getMyLatestForArticle(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const sub = await submissionService.getMyLatestForArticle(req.user.id, req.params.articleId);
  res.json({ ok: true, data: sub });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const sub = await submissionService.getById(
    req.params.id,
    req.user.id,
    req.user.role === Role.ADMIN,
  );
  res.json({ ok: true, data: sub });
}

export async function adminRecent(_req: Request, res: Response): Promise<void> {
  const items = await submissionService.listRecentForAdmin(30);
  res.json({ ok: true, data: items });
}
