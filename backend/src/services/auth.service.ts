import bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { signAccessToken } from '../utils/jwt';
import type { LoginInput, SignupInput } from '../validators/auth.validator';

const SALT_ROUNDS = 10;

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export async function signup(input: SignupInput): Promise<{ user: SafeUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? Role.USER,
      gamification: { badges: [], streak: 0, lastActivityAt: null, totalPoints: 0 },
      readingProgress: [],
      stats: { assignmentsAttempted: 0, assignmentsPassed: 0, avgScore: 0 },
    },
  });

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  return { user: toSafeUser(user), token };
}

export async function login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  return { user: toSafeUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  return toSafeUser(user);
}
