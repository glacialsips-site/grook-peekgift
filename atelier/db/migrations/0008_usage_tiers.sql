ALTER TABLE "peek_v2"."users" ADD COLUMN "tier" text NOT NULL DEFAULT 'authenticated';--> statement-breakpoint
CREATE TABLE "peek_v2"."usage_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text,
	"vendor" text NOT NULL,
	"kind" text NOT NULL,
	"cost_cents" integer NOT NULL DEFAULT 0,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"ts" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "peek_v2"."usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_ledger_user_id_ts_idx" ON "peek_v2"."usage_ledger" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "usage_ledger_session_id_ts_idx" ON "peek_v2"."usage_ledger" USING btree ("session_id","ts");--> statement-breakpoint
CREATE INDEX "usage_ledger_vendor_ts_idx" ON "peek_v2"."usage_ledger" USING btree ("vendor","ts");--> statement-breakpoint
ALTER TABLE "peek_v2"."usage_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peek_v2"."usage_ledger" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "peek_v2"."tier_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "peek_v2"."tier_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peek_v2"."tier_config" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
