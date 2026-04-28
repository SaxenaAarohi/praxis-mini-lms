import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace request data with parsed/coerced values
      Object.assign(req, { [source]: parsed });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_';
          (fieldErrors[key] ||= []).push(issue.message);
        }
        throw ApiError.unprocessable('Validation failed', { fieldErrors });
      }
      throw err;
    }
  };
}
