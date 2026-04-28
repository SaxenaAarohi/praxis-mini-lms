import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (!allowed.includes(req.user.role)) {
      throw ApiError.forbidden(`Requires role: ${allowed.join(' or ')}`);
    }
    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
