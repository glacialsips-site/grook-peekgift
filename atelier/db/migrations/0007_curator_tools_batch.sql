ALTER TABLE "peek_v2"."peeks" ADD COLUMN "giver_names" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "peek_v2"."peeks" ADD COLUMN "budget_cents" integer;--> statement-breakpoint
ALTER TABLE "peek_v2"."peeks" ADD COLUMN "recipient_profile" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
