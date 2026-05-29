CREATE TABLE "peek_v2"."peek_mutation_log" (
	"id" text PRIMARY KEY NOT NULL,
	"peek_id" uuid NOT NULL,
	"turn_id" text NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verb" text NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" text,
	"subject_title_snapshot" text,
	"tool_input" jsonb NOT NULL,
	"tool_output" jsonb NOT NULL,
	"changed_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"chip_color" text,
	"inverse" jsonb,
	"scrape_cost_cents" integer,
	"image_gen_cost_cents" integer,
	"llm_input_tokens" integer,
	"llm_output_tokens" integer
);
--> statement-breakpoint
ALTER TABLE "peek_v2"."peek_mutation_log" ADD CONSTRAINT "peek_mutation_log_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "peek_mutation_log_peek_emitted_idx" ON "peek_v2"."peek_mutation_log" USING btree ("peek_id","emitted_at");--> statement-breakpoint
CREATE INDEX "peek_mutation_log_turn_idx" ON "peek_v2"."peek_mutation_log" USING btree ("turn_id");--> statement-breakpoint
ALTER TABLE "peek_v2"."peek_mutation_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "peek_v2"."peek_mutation_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "peek_v2"."peek_mutation_log" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON "peek_v2"."peek_mutation_log" TO service_role;--> statement-breakpoint
REVOKE UPDATE, DELETE ON "peek_v2"."peek_mutation_log" FROM service_role;--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
