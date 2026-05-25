CREATE SCHEMA "peek_v2";
--> statement-breakpoint
CREATE TYPE "peek_v2"."peek_status" AS ENUM('draft', 'published', 'claimed', 'archived');--> statement-breakpoint
CREATE TYPE "peek_v2"."card_type" AS ENUM('product', 'activity', 'aspirational', 'digital');--> statement-breakpoint
CREATE TYPE "peek_v2"."variant_selection" AS ENUM('pick_one', 'pick_any', 'pick_all');--> statement-breakpoint
CREATE TYPE "peek_v2"."collaborator_role" AS ENUM('organizer', 'co_organizer', 'contributor');--> statement-breakpoint
CREATE TABLE "peek_v2"."users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."peeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"curator_id" text NOT NULL,
	"recipient_name" text,
	"relationship" text,
	"occasion" text,
	"vibe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hero_image_url" text,
	"hero_image_source" text,
	"hero_prompt" text,
	"note_md" text,
	"status" "peek_v2"."peek_status" DEFAULT 'draft' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"share_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peeks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peek_id" uuid NOT NULL,
	"variant_group_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"type" "peek_v2"."card_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"source_url" text,
	"source_retailer" text,
	"affiliate_url" text,
	"affiliate_network" text,
	"commission_pct" numeric(5, 2),
	"value_cents" integer,
	"reveal_value" boolean DEFAULT false NOT NULL,
	"is_taunt" boolean DEFAULT false NOT NULL,
	"taunt_text" text,
	"is_locked" boolean DEFAULT false NOT NULL,
	"unlock_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_date" timestamp with time zone,
	"location_hint" text,
	"added_by_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."variant_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peek_id" uuid NOT NULL,
	"title" text NOT NULL,
	"selection" "peek_v2"."variant_selection" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peek_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"picked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_signature" text,
	"recipient_note" text,
	"beg_message" text,
	"beg_approved_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"fulfillment_notes" text
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."peek_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peek_id" uuid NOT NULL,
	"user_id" text,
	"invited_email" text,
	"role" "peek_v2"."collaborator_role" NOT NULL,
	"invite_token" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peek_collaborators_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "peek_collaborators_peek_user_unique" UNIQUE("peek_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"relationship" text,
	"birthday" date,
	"anniversary" date,
	"last_peek_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"session_id" text,
	"peek_id" uuid,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peek_v2"."affiliate_revenue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" text NOT NULL,
	"external_txn_id" text,
	"card_id" uuid,
	"pick_id" uuid,
	"peek_id" uuid,
	"reported_at" timestamp with time zone,
	"amount_cents" integer,
	"commission_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_revenue_external_txn_id_unique" UNIQUE("external_txn_id")
);
--> statement-breakpoint
ALTER TABLE "peek_v2"."peeks" ADD CONSTRAINT "peeks_curator_id_users_clerk_user_id_fk" FOREIGN KEY ("curator_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."cards" ADD CONSTRAINT "cards_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."cards" ADD CONSTRAINT "cards_variant_group_id_variant_groups_id_fk" FOREIGN KEY ("variant_group_id") REFERENCES "peek_v2"."variant_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."cards" ADD CONSTRAINT "cards_added_by_user_id_users_clerk_user_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."variant_groups" ADD CONSTRAINT "variant_groups_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."picks" ADD CONSTRAINT "picks_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."picks" ADD CONSTRAINT "picks_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "peek_v2"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."peek_collaborators" ADD CONSTRAINT "peek_collaborators_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."peek_collaborators" ADD CONSTRAINT "peek_collaborators_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."relationships" ADD CONSTRAINT "relationships_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."relationships" ADD CONSTRAINT "relationships_last_peek_id_peeks_id_fk" FOREIGN KEY ("last_peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."events" ADD CONSTRAINT "events_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "peek_v2"."users"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."events" ADD CONSTRAINT "events_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."affiliate_revenue" ADD CONSTRAINT "affiliate_revenue_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "peek_v2"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."affiliate_revenue" ADD CONSTRAINT "affiliate_revenue_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "peek_v2"."picks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peek_v2"."affiliate_revenue" ADD CONSTRAINT "affiliate_revenue_peek_id_peeks_id_fk" FOREIGN KEY ("peek_id") REFERENCES "peek_v2"."peeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "peeks_curator_id_idx" ON "peek_v2"."peeks" USING btree ("curator_id");--> statement-breakpoint
CREATE INDEX "peeks_slug_idx" ON "peek_v2"."peeks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "peeks_status_idx" ON "peek_v2"."peeks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cards_peek_id_idx" ON "peek_v2"."cards" USING btree ("peek_id");--> statement-breakpoint
CREATE INDEX "cards_variant_group_id_idx" ON "peek_v2"."cards" USING btree ("variant_group_id");--> statement-breakpoint
CREATE INDEX "picks_peek_id_idx" ON "peek_v2"."picks" USING btree ("peek_id");--> statement-breakpoint
CREATE INDEX "picks_card_id_idx" ON "peek_v2"."picks" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "relationships_user_id_idx" ON "peek_v2"."relationships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_ts_idx" ON "peek_v2"."events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "events_user_id_idx" ON "peek_v2"."events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_peek_id_idx" ON "peek_v2"."events" USING btree ("peek_id");--> statement-breakpoint
CREATE INDEX "events_kind_idx" ON "peek_v2"."events" USING btree ("kind");