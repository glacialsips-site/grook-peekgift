import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env['DATABASE_URL']! },
  schemaFilter: ['peek_v2'],
  strict: true,
  verbose: true,
} satisfies Config;
