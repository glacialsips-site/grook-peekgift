import { pgSchema } from 'drizzle-orm/pg-core';

// All tables live in the `peek_v2` Postgres schema.
export const peekV2 = pgSchema('peek_v2');
