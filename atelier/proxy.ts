import { randomUUID } from 'node:crypto';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/forgot-password(.*)',
  '/sso-callback(.*)',
  '/g/(.*)',              // recipient pages — public by design
  '/build(.*)',           // anon curators allowed; chat route enforces deferred auth wall
  '/api/chat(.*)',        // anon turn cap + tier throttle enforced inside the route
  '/api/upload(.*)',      // anon uploads validated via peek-anon-session cookie + assertPeekAccess
  '/api/webhooks/(.*)',   // signed webhooks
  '/api/stripe/(.*)',     // signed Stripe webhooks
  '/api/pick(.*)',        // recipient picks (HMAC-signed cookie auth, not Clerk)
  '/api/og/(.*)',         // public OG images
  '/api/posthog/(.*)',    // PostHog reverse proxy
  '/api/inngest(.*)',     // Inngest signs every invocation
  '/monitoring(.*)',      // Sentry tunnel route — bypass ad-blockers
  '/styles-test(.*)',     // local-only verification harness for the styles engine
  '/mobile-audit(.*)',    // local-only mobile-audit fixture pages (page guards production with 404)
]);

// Routes where an anonymous-session cookie must be present so Server Components
// can attribute peek rows to a guest curator. Server Components can READ cookies
// in Next 16 but cannot WRITE them — we mint the cookie here instead.
const requiresAnonSessionCookie = createRouteMatcher([
  '/build(.*)',
  '/api/chat(.*)',
  '/api/upload(.*)',
]);

const ANON_SESSION_COOKIE = 'peek-anon-session';
const ANON_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (!requiresAnonSessionCookie(req)) return;

  const existing = req.cookies.get(ANON_SESSION_COOKIE)?.value;
  if (existing && existing.length > 0) return;

  // Mint the cookie now so downstream Server Components see it on this request
  // AND it persists for follow-up requests.
  const fresh = randomUUID();
  req.cookies.set(ANON_SESSION_COOKIE, fresh);
  const response = NextResponse.next({ request: req });
  response.cookies.set({
    name: ANON_SESSION_COOKIE,
    value: fresh,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    maxAge: ANON_SESSION_MAX_AGE,
  });
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
