-- vNext recipient selection store: one row per peek (single-recipient v1). The selection
-- engine (packages/core decidePick) validates a toggle server-side, then the resulting set
-- persists here. Applied to the live project via the connector on 2026-06-02; kept here for
-- reproducibility.

create table if not exists peek_v2.peek_picks (
  peek_id text primary key references peek_v2.peek_documents(id) on delete cascade,
  picks jsonb not null default '[]'::jsonb,
  recipient_note text,
  updated_at timestamptz not null default now()
);

alter table peek_v2.peek_picks enable row level security;

comment on table peek_v2.peek_picks is
  'vNext: the recipient''s current selection for a peek (one row per peek; single-recipient v1). Service-role only; RLS default-deny.';
