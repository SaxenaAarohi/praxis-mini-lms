import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice(7).trim();
  if (!token) throw ApiError.unauthorized('Missing token');

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7).trim());
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    
  }
  next();
}
