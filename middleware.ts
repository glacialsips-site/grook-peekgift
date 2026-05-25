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

const hasRealClerkSecret = (() => {
  const k = process.env.CLERK_SECRET_KEY;
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  return /^sk_(live|test)_[A-Za-z0-9+/=_-]{16,}/.test(k);
})();

const protectedClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

// Wrap in a try/catch so a Clerk-side error (invalid key, unauthorized origin,
// API down) doesn't bring the whole site down — public pages still render.
export default async function middleware(req: NextRequest) {
  if (!hasRealClerkSecret) return NextResponse.next();
  try {
    return await (protectedClerk as any)(req);
  } catch (e: any) {
    console.error('[clerk-middleware]', e?.message || e);
    // For public routes, just continue. For protected, redirect to sign-in.
    if (isPublic(req)) return NextResponse.next();
    const url = new URL('/sign-in', req.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/api/(.*)']
};
