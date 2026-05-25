ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, peek_v2';--> statement-breakpoint
GRANT USAGE ON SCHEMA "peek_v2" TO anon, authenticated, service_role;--> statement-breakpoint
GRANT ALL ON ALL TABLES IN SCHEMA "peek_v2" TO service_role;--> statement-breakpoint
GRANT ALL ON ALL SEQUENCES IN SCHEMA "peek_v2" TO service_role;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "peek_v2" TO anon, authenticated;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "peek_v2" TO anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" GRANT ALL ON TABLES TO service_role;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" GRANT ALL ON SEQUENCES TO service_role;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "peek_v2" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;--> statement-breakpoint
NOTIFY pgrst, 'reload config';--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
