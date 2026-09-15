CREATE TYPE "public"."photo_category" AS ENUM('progress', 'material_delivery', 'issue', 'before', 'after', 'receipt', 'delivery_note', 'variation', 'closeout');--> statement-breakpoint
ALTER TYPE "public"."document_number_type" ADD VALUE 'stage_closeout_report';--> statement-breakpoint
ALTER TYPE "public"."document_number_type" ADD VALUE 'project_closeout_report';--> statement-breakpoint
CREATE TABLE "site_diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"weather" text,
	"workers_on_site" integer,
	"activities" text,
	"materials_used" text,
	"equipment_used" text,
	"delays" text,
	"issues" text,
	"instructions" text,
	"visitors" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_diary_entries_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid,
	"stage_id" uuid,
	"task_id" uuid,
	"site_diary_entry_id" uuid,
	"delivery_id" uuid,
	"payment_record_id" uuid,
	"variation_id" uuid,
	"file" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"filename" text NOT NULL,
	"category" "photo_category" NOT NULL,
	"caption" text,
	"gps_lat" double precision,
	"gps_lng" double precision,
	"captured_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "stage_closeouts" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"base_number" integer NOT NULL,
	"display_number" text NOT NULL,
	"document_snapshot" jsonb NOT NULL,
	"closed_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_closeouts_stage_id_key" UNIQUE("stage_id")
);
--> statement-breakpoint
CREATE TABLE "project_closeouts" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"display_number" text NOT NULL,
	"document_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_closeouts_id_account_id_key" UNIQUE("id","account_id"),
	CONSTRAINT "project_closeouts_project_id_key" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "site_diary_entries" ADD CONSTRAINT "site_diary_entries_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_diary_entries" ADD CONSTRAINT "site_diary_entries_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_task_id_account_id_fk" FOREIGN KEY ("task_id","account_id") REFERENCES "public"."tasks"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_site_diary_entry_id_account_id_fk" FOREIGN KEY ("site_diary_entry_id","account_id") REFERENCES "public"."site_diary_entries"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_delivery_id_account_id_fk" FOREIGN KEY ("delivery_id","account_id") REFERENCES "public"."delivery_records"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_payment_record_id_account_id_fk" FOREIGN KEY ("payment_record_id","account_id") REFERENCES "public"."payment_records"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_variation_id_account_id_fk" FOREIGN KEY ("variation_id","account_id") REFERENCES "public"."variations"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_closeouts" ADD CONSTRAINT "stage_closeouts_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_closeouts" ADD CONSTRAINT "project_closeouts_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern
-- 0002/0003/0006/0007/0008/0009 use.
SELECT app.enable_standard_rls('public.site_diary_entries');
SELECT app.enable_standard_rls('public.photos');
SELECT app.enable_standard_rls('public.stage_closeouts');
SELECT app.enable_standard_rls('public.project_closeouts');