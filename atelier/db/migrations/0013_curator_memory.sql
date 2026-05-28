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

COMMENT ON TABLE "peek_v2"."curator_memory" IS
  'Anthropic Memory tool (memory_20250818) backing store. One row per memory file. Service-role only.';--> statement-breakpoint
COMMENT ON COLUMN "peek_v2"."curator_memory"."path" IS
  'Virtual filesystem path: /memories/<clerk_user_id>/<relative-path>. Validated by CHECK constraint + application-layer path-traversal guard.';--> statement-breakpoint

NOTIFY pgrst, 'reload schema';
