import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import type Database from 'better-sqlite3';
import { DbUser, getDb, hashPassword, verifyPassword } from './db';

export const SESSION_COOKIE_NAME = 'ajaia_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'ajaia-docs-dev-secret-change-in-production';
}

export function toPublicUser(row: Pick<DbUser, 'id' | 'name' | 'email' | 'avatar_color'>): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
  };
}

export function signSessionToken(userId: string, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string, nowMs = Date.now()): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp) return null;
    if (parsed.exp < Math.floor(nowMs / 1000)) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

export async function getCurrentUser(db: Database.Database = getDb()): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = db
    .prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?')
    .get(userId) as Pick<DbUser, 'id' | 'name' | 'email' | 'avatar_color'> | undefined;

  return user ? toPublicUser(user) : null;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const isHttps = headerStore.get('x-forwarded-proto') === 'https';
  const token = signSessionToken(userId);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function authenticateUser(
  db: Database.Database,
  email: string,
  password: string
): PublicUser | null {
  const normalized = email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, name, email, password_hash, avatar_color FROM users WHERE email = ?')
    .get(normalized) as DbUser | undefined;

  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return toPublicUser(user);
}

export function registerUser(
  db: Database.Database,
  name: string,
  email: string,
  password: string
): { user?: PublicUser; error?: string } {
  const normalized = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (existing) {
    return { error: 'An account with this email already exists.' };
  }

  const id = `user-${crypto.randomUUID()}`;
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), normalized, hashPassword(password), avatarColor, now);

  return {
    user: {
      id,
      name: name.trim(),
      email: normalized,
      avatarColor,
    },
  };
}

export function listAllUsers(db: Database.Database): PublicUser[] {
  const rows = db
    .prepare('SELECT id, name, email, avatar_color FROM users ORDER BY name ASC')
    .all() as Pick<DbUser, 'id' | 'name' | 'email' | 'avatar_color'>[];
  return rows.map(toPublicUser);
}
