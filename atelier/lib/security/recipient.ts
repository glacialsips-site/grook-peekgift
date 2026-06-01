import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export class GuestSecretMissingError extends Error {
  constructor() {
    super('guest_claim_token_secret_missing');
    this.name = 'GuestSecretMissingError';
  }
}

const COOKIE_NAME = 'recipient_session';
const COOKIE_TTL_DAYS = 365;
const COOKIE_TTL_SECONDS = COOKIE_TTL_DAYS * 24 * 60 * 60;

export const RECIPIENT_SESSION_COOKIE_NAME = COOKIE_NAME;

export function signRecipient(sessionId: string): string {
  const secret = env.GUEST_CLAIM_TOKEN_SECRET;
  if (!secret) throw new GuestSecretMissingError();
  return createHmac('sha256', secret).update(sessionId).digest('hex');
}

export function trySignRecipient(sessionId: string): string | null {
  try {
    return signRecipient(sessionId);
  } catch (err) {
    if (err instanceof GuestSecretMissingError) return null;
    throw err;
  }
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function buildRecipientSessionCookieValue(sessionId: string): string {
  const signature = signRecipient(sessionId);
  return `${sessionId}.${signature}`;
}

export type RecipientSession = {
  sessionId: string;
  signature: string;
};

export function parseRecipientSessionCookieValue(
  raw: string | undefined | null,
): RecipientSession | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf('.');
  if (idx <= 0 || idx === raw.length - 1) return null;
  const sessionId = raw.slice(0, idx);
  const provided = raw.slice(idx + 1);
  let expected: string;
  try {
    expected = signRecipient(sessionId);
  } catch (err) {
    if (err instanceof GuestSecretMissingError) return null;
    throw err;
  }
  if (!constantTimeEqualHex(expected, provided)) return null;
  return { sessionId, signature: expected };
}

export async function readRecipientSessionFromCookies(): Promise<RecipientSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value ?? null;
  return parseRecipientSessionCookieValue(raw);
}

type CookieSetter = (opts: {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
}) => void;

export async function ensureRecipientSessionCookie(): Promise<RecipientSession> {
  const jar = await cookies();
  const existing = parseRecipientSessionCookieValue(jar.get(COOKIE_NAME)?.value);
  if (existing) return existing;
  const sessionId = randomUUID();
  const value = buildRecipientSessionCookieValue(sessionId);
  (jar.set as CookieSetter)({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    maxAge: COOKIE_TTL_SECONDS,
  });
  return { sessionId, signature: signRecipient(sessionId) };
}
