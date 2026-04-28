import type { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboard.service';
import { ApiError } from '../utils/ApiError';

export async function top(req: Request, res: Response): Promise<void> {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const data = await leaderboardService.computeTop(limit);
  res.json({ ok: true, data });
}

export async function myRank(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const data = await leaderboardService.getRank(req.user.id);
  res.json({ ok: true, data });
}
