CREATE UNIQUE INDEX IF NOT EXISTS "cards_peek_position_uniq" ON "peek_v2"."cards" ("peek_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "variant_groups_peek_position_uniq" ON "peek_v2"."variant_groups" ("peek_id","position");--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
