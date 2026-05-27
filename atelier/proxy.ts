import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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
