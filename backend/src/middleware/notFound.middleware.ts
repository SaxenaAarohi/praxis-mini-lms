import type { Request, Response } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: {
      status: 404,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}
