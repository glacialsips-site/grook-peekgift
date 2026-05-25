ALTER TABLE "peek_v2"."peeks" ALTER COLUMN "curator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "peek_v2"."peeks" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;