-- Packet 41 — Anthropic surface expansion: curator_memory table for Memory tool backing store.
--
-- Implements the storage layer for Anthropic's client-side `memory_20250818` tool:
-- a virtual filesystem rooted at /memories/<clerk_user_id>/... with the tool handler
-- (see atelier/lib/anthropic/memory/store.ts) translating view/create/str_replace/
-- insert/delete/rename commands into row reads/writes here.
--
-- Composite primary key on (clerk_user_id, path) — every memory file is a single row.
-- Storage is INTENTIONALLY flat: no real directories. "Listing a directory" via
-- the view command is a path-prefix scan; the tool handler synthesizes a tree
-- view from the prefix match. This keeps the schema trivially indexable and
-- avoids reparenting on rename.
--
-- Limits enforced by the application layer (NOT by check constraints, so we can
-- evolve them without a migration):
--   - 50KB max per file (content length)
--   - 100 files max per curator
--   - paths must match `^/memories/<clerk_user_id>/[A-Za-z0-9._/-]+$`
--   - no `..`, no URL-encoded traversal, no leading/trailing slashes on segments
--
-- RLS posture: DEFAULT DENY. The Memory tool runs server-side (chat route only),
-- so reads/writes always happen via the Supabase service-role client which
-- bypasses RLS (the role has BYPASSRLS = true per Supabase defaults). No anon
-- or authenticated policy is added — direct PostgREST traffic is locked out by
-- the missing policies + the schema-wide privilege REVOKEs from migration 0006.
--
-- If a future Tier 2 surface exposes curator memory to the curator's OWN signed-in
-- session (e.g. a "memory diary" page in /settings), add a per-row policy then.
-- Do not add it pre-emptively — fewer surfaces = smaller attack surface.

CREATE TABLE IF NOT EXISTS "peek_v2"."curator_memory" (
  "clerk_user_id" text NOT NULL,
  "path" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "size_bytes" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "curator_memory_pkey" PRIMARY KEY ("clerk_user_id", "path"),
  CONSTRAINT "curator_memory_path_format_chk"
    CHECK ("path" ~ '^/memories/[A-Za-z0-9_-]+/[A-Za-z0-9._/-]+$'),
  CONSTRAINT "curator_memory_no_traversal_chk"
    CHECK ("path" NOT LIKE '%..%' AND "path" NOT LIKE '%//%'),
  CONSTRAINT "curator_memory_size_chk"
    CHECK ("size_bytes" >= 0 AND "size_bytes" <= 51200)
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "curator_memory_user_prefix_idx"
  ON "peek_v2"."curator_memory" ("clerk_user_id", "path" text_pattern_ops);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "curator_memory_user_updated_idx"
  ON "peek_v2"."curator_memory" ("clerk_user_id", "updated_at" DESC);--> statement-breakpoint

ALTER TABLE "peek_v2"."curator_memory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peek_v2"."curator_memory" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

REVOKE ALL ON "peek_v2"."curator_memory" FROM anon;--> statement-breakpoint
REVOKE ALL ON "peek_v2"."curator_memory" FROM authenticated;--> statement-breakpoint

-- No policies created. Service-role only via BYPASSRLS. Direct PostgREST traffic
-- gets 401/403 because there's no SELECT/INSERT/UPDATE/DELETE policy for either
-- anon or authenticated. This is the default-deny posture from migration 0005.

COMMENT ON TABLE "peek_v2"."curator_memory" IS
  'Anthropic Memory tool (memory_20250818) backing store. One row per memory file. Service-role only.';--> statement-breakpoint
COMMENT ON COLUMN "peek_v2"."curator_memory"."path" IS
  'Virtual filesystem path: /memories/<clerk_user_id>/<relative-path>. Validated by CHECK constraint + application-layer path-traversal guard.';--> statement-breakpoint

-- Optional: peeks.metadata gets a new key `uploaded_files: Array<{ file_id, original_name, mime, size_bytes, uploaded_at, purpose }>`
-- for the Files API integration. No schema change required — metadata is jsonb.
-- Documenting here for orchestrator awareness.

NOTIFY pgrst, 'reload schema';
