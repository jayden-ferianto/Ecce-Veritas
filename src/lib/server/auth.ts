import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'ecce_veritas_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

function authConfig() {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.APP_SECRET;
  if (!password || password.length < 16 || !secret || secret.length < 32) return undefined;
  return { password, secret };
}

export function isAuthConfigured(): boolean {
  return Boolean(authConfig());
}

export function passwordMatches(candidate: string): boolean {
  const config = authConfig();
  if (!config) return false;
  const expected = createHash('sha256').update(config.password).digest();
  const actual = createHash('sha256').update(candidate).digest();
  return timingSafeEqual(expected, actual);
}

export function createSessionToken(): string {
  const config = authConfig();
  if (!config) throw new Error('Authentication is not configured.');

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${expiresAt}.${randomBytes(24).toString('base64url')}`;
  const signature = createHmac('sha256', config.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function isValidSession(token: string | undefined): boolean {
  const config = authConfig();
  if (!config || !token) return false;

  const parts = token.split('.');
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[1]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[2])
  ) {
    return false;
  }

  const expiresAt = Number(parts[0]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', config.secret).update(payload).digest('base64url');
  if (parts[2].length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
}

export function sessionCookieIsSecure(): boolean {
  return process.env.NODE_ENV === 'production' &&
    process.env.AUTH_COOKIE_SECURE?.toLowerCase() !== 'false';
}
