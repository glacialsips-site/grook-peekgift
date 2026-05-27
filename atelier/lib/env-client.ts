import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const raw = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'],
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env['NEXT_PUBLIC_CLERK_SIGN_IN_URL'],
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env['NEXT_PUBLIC_CLERK_SIGN_UP_URL'],
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
  NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
  NEXT_PUBLIC_SENTRY_DSN: process.env['NEXT_PUBLIC_SENTRY_DSN'],
};

const parsed = schema.safeParse(raw);
export const envClient = parsed.success ? parsed.data : raw;
export type EnvClient = z.infer<typeof schema>;
