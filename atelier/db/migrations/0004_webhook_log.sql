CREATE TABLE "peek_v2"."webhook_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"payload" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webhook_log_source_idx" ON "peek_v2"."webhook_log" USING btree ("source");--> statement-breakpoint
CREATE INDEX "webhook_log_received_at_idx" ON "peek_v2"."webhook_log" USING btree ("received_at");