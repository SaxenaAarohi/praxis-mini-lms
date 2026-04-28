import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { signAccessToken } from '../utils/jwt';

const SALT_ROUNDS = 10;

/** Strip `passwordHash` so it never goes back to the client. */
function toSafeUser(user: User) {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

/** POST /api/auth/signup — create a new user and return JWT. */
export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: Role;
  };

  // 1. Reject duplicate emails up-front (the unique index would catch it
  //    too, but we want a 409 not a 500).
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // 2. Hash the password before storing it.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Create the user with empty defaults for stats / gamification.
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role ?? Role.USER,
      gamification: { badges: [], streak: 0, lastActivityAt: null, totalPoints: 0 },
      readingProgress: [],
      stats: { assignmentsAttempted: 0, assignmentsPassed: 0, avgScore: 0 },
    },
  });

  // 4. Sign a JWT and return user + token.
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  res.status(201).json({ ok: true, data: { user: toSafeUser(user), token } });
}

/** POST /api/auth/login — verify credentials, return JWT. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  // 1. Look up the user.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  // 2. Compare the supplied password to the stored hash.
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  // 3. Same response shape as signup.
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ ok: true, data: { user: toSafeUser(user), token } });
}

/** GET /api/auth/me — read current user from JWT and re-fetch from DB. */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  res.json({ ok: true, data: toSafeUser(user) });
}

/** POST /api/auth/logout — JWT is stateless, so the client just drops it. */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(204).send();
}
