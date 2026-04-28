import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
