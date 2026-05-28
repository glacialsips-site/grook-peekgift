import 'server-only';
import { z } from 'zod';

const schema = z.object({
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  ANTHROPIC_API_KEY: z.string().optional(),

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  PAY_MODE: z.enum(['mock', 'live']).optional(),

  RESEND_API_KEY: z.string().optional(),
  NOTIFICATIONS_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  BROWSERBASE_API_KEY: z.string().optional(),
  BROWSERBASE_PROJECT_ID: z.string().optional(),
  ZENROWS_API_KEY: z.string().optional(),

  FAL_KEY: z.string().optional(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  SKIMLINKS_PUBLISHER_ID: z.string().optional(),
  SKIMLINKS_WEBHOOK_SECRET: z.string().optional(),
  SOVRN_API_KEY: z.string().optional(),
  TOLT_API_KEY: z.string().optional(),

  GUEST_CLAIM_TOKEN_SECRET: z
    .string()
    .min(32, 'GUEST_CLAIM_TOKEN_SECRET must be >=32 chars')
    .optional(),

  ADMIN_CLERK_USER_IDS: z.string().optional(),

  WEB_SEARCH_MAX_USES: z.coerce.number().int().positive().optional(),
  WEB_FETCH_MAX_USES: z.coerce.number().int().positive().optional(),
  MEMORY_MAX_FILES_PER_CURATOR: z.coerce.number().int().positive().optional(),
  MEMORY_MAX_FILE_KB: z.coerce.number().int().min(1).max(50).optional(),
  EXTENDED_THINKING_BUDGET_TOKENS: z.coerce.number().int().positive().optional(),

  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment — see logs above');
}

export const env = parsed.data;
export type Env = z.infer<typeof schema>;
