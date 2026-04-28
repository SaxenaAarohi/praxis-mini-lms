import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { ApiError } from '../utils/ApiError';

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const data = await dashboardService.getUserDashboard(req.user.id);
  res.json({ ok: true, data });
}

export async function admin(_req: Request, res: Response): Promise<void> {
  const data = await dashboardService.getAdminStats();
  res.json({ ok: true, data });
}
