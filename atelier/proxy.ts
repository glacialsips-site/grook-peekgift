import { randomUUID } from 'node:crypto';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  RECIPIENT_SESSION_COOKIE_NAME,
  buildRecipientSessionCookieValue,
  parseRecipientSessionCookieValue,
} from '@/lib/security/recipient';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/forgot-password(.*)',
  '/sso-callback(.*)',
  '/g/(.*)',
  '/build(.*)',
  '/api/chat(.*)',
  '/api/upload(.*)',
  '/api/webhooks/(.*)',
  '/api/stripe/(.*)',
  '/api/pick(.*)',
  '/api/og/(.*)',
  '/api/posthog/(.*)',
  '/api/inngest(.*)',
  '/monitoring(.*)',
  '/styles-test(.*)',
  '/mobile-audit(.*)',
]);

const requiresAnonSessionCookie = createRouteMatcher([
  '/build(.*)',
  '/api/chat(.*)',
  '/api/upload(.*)',
]);

const requiresRecipientSessionCookie = createRouteMatcher(['/g/(.*)']);

const ANON_SESSION_COOKIE = 'peek-anon-session';
const ANON_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const RECIPIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const needsAnon = requiresAnonSessionCookie(req);
  const needsRecipient = requiresRecipientSessionCookie(req);
  if (!needsAnon && !needsRecipient) return;

  const isProd = process.env['NODE_ENV'] === 'production';
  let response: ReturnType<typeof NextResponse.next> | null = null;

  if (needsAnon) {
    const existing = req.cookies.get(ANON_SESSION_COOKIE)?.value;
    if (!existing || existing.length === 0) {
      const fresh = randomUUID();
      req.cookies.set(ANON_SESSION_COOKIE, fresh);
      response ??= NextResponse.next({ request: req });
      response.cookies.set({
        name: ANON_SESSION_COOKIE,
        value: fresh,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
        maxAge: ANON_SESSION_MAX_AGE,
      });
    }
  }

  if (needsRecipient) {
    const existingRaw = req.cookies.get(RECIPIENT_SESSION_COOKIE_NAME)?.value;
    const parsed = parseRecipientSessionCookieValue(existingRaw);
    if (!parsed) {
      const sessionId = randomUUID();
      let value: string;
      try {
        value = buildRecipientSessionCookieValue(sessionId);
      } catch {
        return response ?? undefined;
      }
      req.cookies.set(RECIPIENT_SESSION_COOKIE_NAME, value);
      response ??= NextResponse.next({ request: req });
      response.cookies.set({
        name: RECIPIENT_SESSION_COOKIE_NAME,
        value,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
        maxAge: RECIPIENT_SESSION_MAX_AGE,
      });
    }
  }

  return response ?? undefined;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
