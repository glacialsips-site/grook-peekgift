ALTER TABLE "peek_v2"."usage_ledger" ADD COLUMN "peek_id" uuid REFERENCES "peek_v2"."peeks"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX "usage_ledger_peek_id_idx" ON "peek_v2"."usage_ledger" USING btree ("peek_id");--> statement-breakpoint
CREATE INDEX "usage_ledger_peek_id_ts_idx" ON "peek_v2"."usage_ledger" USING btree ("peek_id","ts");--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
