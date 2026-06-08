-- vNext document store: one folded PeekIR snapshot per peek. Additive to peek_v2 (does not
-- touch the legacy app's tables). Service-role only; RLS default-deny. Applied to the live
-- project ewqpujqerdnrkjqlpobo via the Supabase connector on 2026-06-02; kept here for
-- reproducibility on any other environment.

create table if not exists peek_v2.peek_documents (
  id text primary key,
  slug text not null unique,
  curator_id text,
  status text not null default 'draft',
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peek_documents_slug_idx on peek_v2.peek_documents (slug);

alter table peek_v2.peek_documents enable row level security;

comment on table peek_v2.peek_documents is
  'vNext: folded PeekIR document snapshots (one row per peek). Service-role only; RLS default-deny.';
