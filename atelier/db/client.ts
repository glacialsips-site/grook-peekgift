import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(process.env['DATABASE_URL']!, {
  prepare: false, // pgbouncer / supabase pooler compatibility
  max: 10,
});

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
