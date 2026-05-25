type AnyRow = Record<string, unknown>;
type AnyTable = { Row: AnyRow; Insert: AnyRow; Update: AnyRow; Relationships: [] };

export type Database = {
  peek_v2: {
    Tables: { [tableName: string]: AnyTable };
    Views: { [viewName: string]: AnyTable };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
