ALTER TABLE "peek_v2"."users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
