import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/g/(.*)',              // recipient pages — public by design
  '/api/webhooks/(.*)',   // signed webhooks
  '/api/stripe/(.*)',     // signed Stripe webhooks
  '/api/pick(.*)',        // recipient picks (HMAC-signed cookie auth, not Clerk)
  '/api/og/(.*)',         // public OG images
  '/api/posthog/(.*)',    // PostHog reverse proxy
  '/api/inngest(.*)',     // Inngest signs every invocation
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
