import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, ensureUserDefaults } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'breathewise-dev-secret-change-in-prod-9f2b1c';
const TOKEN_TTL = '14d';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  isGuest: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, isGuest: user.isGuest },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
      sub: number;
      email: string;
      name: string;
      isGuest: boolean;
    };
    const row = db
      .prepare('SELECT id, email, name, is_guest FROM users WHERE id = ?')
      .get(decoded.sub) as { id: number; email: string; name: string; is_guest: number } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      isGuest: Boolean(row.is_guest),
    };
  } catch {
    return null;
  }
}

export function getOrCreateGuestUser(guestKey: string): AuthUser {
  const safeKey = guestKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';
  const email = `guest-${safeKey}@guest.breathewise.local`;
  const existing = db
    .prepare('SELECT id, email, name, is_guest FROM users WHERE email = ?')
    .get(email) as { id: number; email: string; name: string; is_guest: number } | undefined;

  if (existing) {
    ensureUserDefaults(existing.id);
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      isGuest: Boolean(existing.is_guest),
    };
  }

  const randomHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 6);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name, is_guest) VALUES (?, ?, ?, 1)')
    .run(email, randomHash, 'Guest Household');

  const userId = Number(info.lastInsertRowid);
  ensureUserDefaults(userId);
  return {
    id: userId,
    email,
    name: 'Guest Household',
    isGuest: true,
  };
}

export function resolveSessionMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifyAuthToken(token);
    if (verified) {
      req.user = verified;
      return next();
    }
  }

  const guestKey = (req.headers['x-guest-session'] as string | undefined) || 'default';
  req.user = getOrCreateGuestUser(guestKey);
  next();
}
