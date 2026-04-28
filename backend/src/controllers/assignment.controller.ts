import type { Request, Response } from 'express';
import * as assignmentService from '../services/assignment.service';

export async function getForArticle(req: Request, res: Response): Promise<void> {
  const articleId = req.params.articleId;
  const assignment = await assignmentService.getAssignmentForArticle(articleId);
  res.json({ ok: true, data: assignment });
}

export async function upsertForArticle(req: Request, res: Response): Promise<void> {
  const articleId = req.params.articleId;
  const assignment = await assignmentService.upsertAssignmentForArticle(articleId, req.body);
  res.status(201).json({ ok: true, data: assignment });
}

export async function getAdmin(req: Request, res: Response): Promise<void> {
  const assignment = await assignmentService.getAssignmentByIdForAdmin(req.params.id);
  res.json({ ok: true, data: assignment });
}

export async function update(req: Request, res: Response): Promise<void> {
  const assignment = await assignmentService.getAssignmentByIdForAdmin(req.params.id);
  const updated = await assignmentService.upsertAssignmentForArticle(assignment.articleId, req.body);
  res.json({ ok: true, data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await assignmentService.deleteAssignment(req.params.id);
  res.status(204).send();
}
