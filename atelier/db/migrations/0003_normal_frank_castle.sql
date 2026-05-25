CREATE TABLE "peek_v2"."chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peek_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"tool_call_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "peek_v2"."chat_messages" ADD CONSTRAINT "chat_messages_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_peek_id_idx" ON "peek_v2"."chat_messages" USING btree ("peek_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "peek_v2"."chat_messages" USING btree ("created_at");