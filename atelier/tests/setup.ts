import { vi } from 'vitest';

const env = process.env as Record<string, string | undefined>;
env.APP_URL = env.APP_URL ?? 'http://localhost:3000';
env.NODE_ENV = env.NODE_ENV ?? 'test';
env.NEXT_PUBLIC_SUPABASE_URL =
  env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://test.supabase.co';
env.SUPABASE_SERVICE_ROLE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role';
env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'test-publishable';

vi.mock('server-only', () => ({}));
