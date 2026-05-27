import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

export type PostgresChangesEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface PostgresChangesFilter {
  event: PostgresChangesEvent;
  schema: string;
  table: string;
  filter?: string;
}

export function subscribePostgresChanges<T extends Record<string, unknown>>(
  channel: RealtimeChannel,
  opts: PostgresChangesFilter,
  handler: (payload: RealtimePostgresChangesPayload<T>) => void,
): RealtimeChannel {
  return (
    channel as RealtimeChannel & {
      on: (
        type: 'postgres_changes',
        filter: PostgresChangesFilter,
        callback: (payload: RealtimePostgresChangesPayload<T>) => void,
      ) => RealtimeChannel;
    }
  ).on('postgres_changes', opts, handler);
}
