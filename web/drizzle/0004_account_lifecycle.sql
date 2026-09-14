ALTER TABLE "accounts" ADD COLUMN "logo" "bytea";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "logo_content_type" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;