import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

export async function signup(req: Request, res: Response): Promise<void> {
  const result = await authService.signup(req.body);
  res.status(201).json({ ok: true, data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.json({ ok: true, data: result });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getCurrentUser(req.user.id);
  res.json({ ok: true, data: user });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(204).send();
}
