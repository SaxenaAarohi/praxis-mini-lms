import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { isProd } from '../config/env';

interface ErrorResponse {
  ok: false;
  error: {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
    requestId?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 422;
    message = 'Validation failed';
    code = 'UNPROCESSABLE';
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ||= []).push(issue.message);
    }
    details = { fieldErrors };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        status = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE';
        const target = (err.meta as { target?: string[] } | undefined)?.target;
        details = target ? { fields: target } : undefined;
        break;
      }
      case 'P2025':
        status = 404;
        message = 'Resource not found';
        code = 'NOT_FOUND';
        break;
      case 'P2023':
        status = 400;
        message = 'Invalid identifier';
        code = 'BAD_REQUEST';
        break;
      default:
        status = 400;
        message = 'Database error';
        code = err.code;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    message = 'Invalid data shape';
    code = 'PRISMA_VALIDATION';
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (status >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  } else {
    logger.warn({ status, message, code, path: req.path }, 'request error');
  }

  const body: ErrorResponse = {
    ok: false,
    error: {
      status,
      message,
      ...(code ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
      ...(req.requestId ? { requestId: req.requestId } : {}),
    },
  };

  if (!isProd && err instanceof Error) {
    (body.error as Record<string, unknown>).stack = err.stack;
  }

  res.status(status).json(body);
}
