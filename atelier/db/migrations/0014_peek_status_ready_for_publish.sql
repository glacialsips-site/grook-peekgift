ALTER TYPE "peek_v2"."peek_status" ADD VALUE IF NOT EXISTS 'ready_for_publish' BEFORE 'published';--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
