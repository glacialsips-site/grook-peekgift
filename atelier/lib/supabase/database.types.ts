import type {
  affiliateRevenue,
  cards,
  chatMessages,
  events,
  peekCollaborators,
  peeks,
  picks,
  relationships,
  users,
  variantGroups,
  webhookLog,
} from '@/db/schema';

type CamelToSnake<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Uppercase<Head>
    ? Head extends Lowercase<Head>
      ? `${Head}${CamelToSnake<Tail>}`
      : `_${Lowercase<Head>}${CamelToSnake<Tail>}`
    : `${Head}${CamelToSnake<Tail>}`
  : S;

type ReplaceDate<V> = V extends Date ? string : V;
type WireInsertValue<V> = V extends Date ? Date | string : V;

type WireSelect<T> = {
  [K in keyof T as K extends string ? CamelToSnake<K> : K]: ReplaceDate<T[K]>;
};

type WireInsert<T> = {
  [K in keyof T as K extends string ? CamelToSnake<K> : K]: WireInsertValue<
    T[K]
  >;
};

type DrizzleTable = {
  $inferSelect: unknown;
  $inferInsert: unknown;
};

type TableType<T extends DrizzleTable> = {
  Row: WireSelect<T['$inferSelect']>;
  Insert: Partial<WireInsert<T['$inferInsert']>>;
  Update: Partial<WireInsert<T['$inferInsert']>>;
  Relationships: [];
};

export type Database = {
  peek_v2: {
    Tables: {
      users: TableType<typeof users>;
      peeks: TableType<typeof peeks>;
      cards: TableType<typeof cards>;
      variant_groups: TableType<typeof variantGroups>;
      picks: TableType<typeof picks>;
      peek_collaborators: TableType<typeof peekCollaborators>;
      relationships: TableType<typeof relationships>;
      events: TableType<typeof events>;
      affiliate_revenue: TableType<typeof affiliateRevenue>;
      chat_messages: TableType<typeof chatMessages>;
      webhook_log: TableType<typeof webhookLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type DbRow<T extends keyof Database['peek_v2']['Tables']> =
  Database['peek_v2']['Tables'][T]['Row'];
export type DbInsert<T extends keyof Database['peek_v2']['Tables']> =
  Database['peek_v2']['Tables'][T]['Insert'];
export type DbUpdate<T extends keyof Database['peek_v2']['Tables']> =
  Database['peek_v2']['Tables'][T]['Update'];
