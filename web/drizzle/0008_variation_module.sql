CREATE TYPE "public"."variation_status" AS ENUM('draft', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."document_number_type" ADD VALUE 'variation';--> statement-breakpoint
CREATE TABLE "variations" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"status" "variation_status" DEFAULT 'draft' NOT NULL,
	"base_number" integer,
	"display_number" text,
	"description" text NOT NULL,
	"reason" text,
	"material_impact" bigint,
	"labour_impact" bigint,
	"fee_impact" bigint,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" date,
	"client_reference" text,
	"notes" text,
	"rejected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "variations_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "additional_funding_request_variations" (
	"account_id" uuid NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	CONSTRAINT "additional_funding_request_variations_funding_request_id_variation_id_pk" PRIMARY KEY("funding_request_id","variation_id")
);
--> statement-breakpoint
ALTER TABLE "material_lines" ADD COLUMN "variation_id" uuid;--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_task_id_account_id_fk" FOREIGN KEY ("task_id","account_id") REFERENCES "public"."tasks"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_funding_request_variations" ADD CONSTRAINT "afr_variations_funding_request_id_account_id_fk" FOREIGN KEY ("funding_request_id","account_id") REFERENCES "public"."funding_requests"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_funding_request_variations" ADD CONSTRAINT "afr_variations_variation_id_account_id_fk" FOREIGN KEY ("variation_id","account_id") REFERENCES "public"."variations"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_lines" ADD CONSTRAINT "material_lines_variation_id_account_id_fk" FOREIGN KEY ("variation_id","account_id") REFERENCES "public"."variations"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern
-- 0002/0003/0006/0007 use.
SELECT app.enable_standard_rls('public.variations');--> statement-breakpoint
SELECT app.enable_standard_rls('public.additional_funding_request_variations');