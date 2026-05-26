REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "peek_v2" FROM anon;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "peek_v2" FROM authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE INSERT, UPDATE, DELETE ON TABLES FROM authenticated;--> statement-breakpoint
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "peek_v2" FROM anon;--> statement-breakpoint
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "peek_v2" FROM authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE USAGE, SELECT ON SEQUENCES FROM anon;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE USAGE, SELECT ON SEQUENCES FROM authenticated;--> statement-breakpoint
REVOKE SELECT ON ALL TABLES IN SCHEMA "peek_v2" FROM anon;--> statement-breakpoint
REVOKE SELECT ON ALL TABLES IN SCHEMA "peek_v2" FROM authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE SELECT ON TABLES FROM anon;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" REVOKE SELECT ON TABLES FROM authenticated;--> statement-breakpoint
GRANT SELECT ON "peek_v2"."peeks" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON "peek_v2"."cards" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON "peek_v2"."variant_groups" TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON "peek_v2"."picks" TO anon, authenticated;--> statement-breakpoint
DROP POLICY IF EXISTS "peeks_anon_select_published" ON "peek_v2"."peeks";--> statement-breakpoint
DROP POLICY IF EXISTS "cards_anon_select_published_peek" ON "peek_v2"."cards";--> statement-breakpoint
DROP POLICY IF EXISTS "variant_groups_anon_select_published_peek" ON "peek_v2"."variant_groups";--> statement-breakpoint
DROP POLICY IF EXISTS "picks_anon_select_published_peek" ON "peek_v2"."picks";--> statement-breakpoint
CREATE POLICY "peeks_anon_select_published" ON "peek_v2"."peeks"
  FOR SELECT TO anon, authenticated
  USING (status IN ('published', 'claimed'));--> statement-breakpoint
CREATE POLICY "cards_anon_select_published_peek" ON "peek_v2"."cards"
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM "peek_v2"."peeks" p
    WHERE p.id = cards.peek_id
      AND p.status IN ('published', 'claimed')
  ));--> statement-breakpoint
CREATE POLICY "variant_groups_anon_select_published_peek" ON "peek_v2"."variant_groups"
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM "peek_v2"."peeks" p
    WHERE p.id = variant_groups.peek_id
      AND p.status IN ('published', 'claimed')
  ));--> statement-breakpoint
CREATE POLICY "picks_anon_select_published_peek" ON "peek_v2"."picks"
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM "peek_v2"."peeks" p
    WHERE p.id = picks.peek_id
      AND p.status IN ('published', 'claimed')
  ));--> statement-breakpoint
NOTIFY pgrst, 'reload config';--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
