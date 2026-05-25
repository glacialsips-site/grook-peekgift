import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublic = createRouteMatcher([
  '/',
  '/g/(.*)',
  '/api/og/(.*)',
  '/api/stripe-webhook',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

// Detect placeholder/unset Clerk secret so the marketing pages still render even
// before Frank drops the real value.
const hasRealClerkSecret = (() => {
  const k = process.env.CLERK_SECRET_KEY;
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  // Real keys are `sk_(live|test)_<base64ish>`. Bail if format is suspect.
  return /^sk_(live|test)_[A-Za-z0-9+/=_-]{16,}/.test(k);
})();

const clerk = hasRealClerkSecret
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublic(req)) await auth.protect();
    })
  : async (_req: NextRequest) => NextResponse.next();

export default clerk;

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/api/(.*)']
};
