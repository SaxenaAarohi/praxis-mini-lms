import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { signAccessToken } from '../utils/jwt';

const SALT_ROUNDS = 10;

function toSafeUser(user: User) {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: Role;
  };

  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

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

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  res.status(201).json({ ok: true, data: { user: toSafeUser(user), token } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ ok: true, data: { user: toSafeUser(user), token } });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  res.json({ ok: true, data: toSafeUser(user) });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(204).send();
}
