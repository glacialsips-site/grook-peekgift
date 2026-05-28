-- Adds the 'ready_for_publish' intermediate state to peek_v2.peek_status.
-- State machine: draft -> ready_for_publish -> published -> claimed (terminal).
-- The 'archived' state is orthogonal and can be reached from any prior state.
--
-- Wired in:
--   - lib/anthropic/tools/mark_ready_for_publish.ts (draft -> ready_for_publish)
--   - app/api/checkout/route.ts (gates on draft OR ready_for_publish; mock path -> published)
--   - app/api/stripe/webhook/route.ts (ready_for_publish OR draft -> published on payment success)

ALTER TYPE "peek_v2"."peek_status" ADD VALUE IF NOT EXISTS 'ready_for_publish' BEFORE 'published';--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
