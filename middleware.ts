import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes: landing, recipient view, OG endpoints, scrape (called by chat which is auth'd)
const isPublic = createRouteMatcher([
  '/',
  '/g/(.*)',
  '/api/og/(.*)',
  '/api/stripe-webhook',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/api/(.*)']
};
