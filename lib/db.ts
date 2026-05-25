// Direct Postgres via the Supabase pooler. No service-role key needed — we have the
// full DATABASE_URL with the postgres user. Scoped to the peek_v2 schema via SET
// search_path. All queries go through this module.

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let _pool: Pool | null = null;

function pool(): Pool {
  if (_pool) return _pool;
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL missing');
  _pool = new Pool({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 6_000
  });
  // On each new client, lock the search path to our isolated schema so unqualified
  // table names resolve to peek_v2.<table>.
  _pool.on('connect', async (client) => {
    try {
      await client.query('SET search_path TO peek_v2, public');
    } catch (e) {
      console.error('search_path set failed', e);
    }
  });
  return _pool;
}

// Generic query helper that returns just rows (the most common shape).
export async function q<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const res: QueryResult<T> = await pool().query<T>(text, params);
  return res.rows;
}

// Single-row query — throws if not exactly one row. Use `q1opt` for nullable.
export async function q1<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<T> {
  const rows = await q<T>(text, params);
  if (rows.length !== 1) {
    throw new Error(`Expected 1 row, got ${rows.length} for query: ${text.slice(0, 80)}`);
  }
  return rows[0];
}

export async function q1opt<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

// Transaction wrapper.
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
