CREATE TYPE "public"."party_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."estimate_model" AS ENUM('budget', 'fixed_price');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."fee_basis" AS ENUM('fixed', 'percent');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('planned', 'active', 'awaiting_funding', 'on_hold', 'ready_for_closeout', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('planned', 'active', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_code" text NOT NULL,
	"name" text NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text,
	"client_email" text,
	"site" text NOT NULL,
	"currency" text DEFAULT 'TZS' NOT NULL,
	"estimate_model" "estimate_model" DEFAULT 'budget' NOT NULL,
	"current_stage_id" uuid,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"started_on" date,
	"expected_completion_on" date,
	"completed_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_account_id_key" UNIQUE("id","account_id"),
	CONSTRAINT "projects_account_id_project_code_key" UNIQUE("account_id","project_code")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"seq" integer NOT NULL,
	"fee_basis" "fee_basis",
	"fee_amount" bigint,
	"fee_percent" numeric(5, 2),
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"status" "stage_status" DEFAULT 'planned' NOT NULL,
	"started_on" date,
	"completed_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stages_id_account_id_key" UNIQUE("id","account_id"),
	CONSTRAINT "stages_project_id_seq_key" UNIQUE("project_id","seq")
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trade" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"status" "party_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subcontractors_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"location" text,
	"payment_terms" text,
	"notes" text,
	"status" "party_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"subcontractor_id" uuid,
	"description" text NOT NULL,
	"seq" integer NOT NULL,
	"labour_original" bigint,
	"labour_revised" bigint,
	"retention_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"status" "task_status" DEFAULT 'planned' NOT NULL,
	"started_on" date,
	"completed_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "material_lines" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"item" text NOT NULL,
	"description" text,
	"qty_original" numeric(14, 3),
	"qty_revised" numeric(14, 3),
	"unit" text NOT NULL,
	"est_unit_cost_original" bigint,
	"est_unit_cost_revised" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_lines_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_lines" ADD CONSTRAINT "material_lines_task_id_account_id_fk" FOREIGN KEY ("task_id","account_id") REFERENCES "public"."tasks"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern 0000
-- uses for the `app` schema helpers.
SELECT app.enable_standard_rls('public.projects');--> statement-breakpoint
SELECT app.enable_standard_rls('public.suppliers');--> statement-breakpoint
SELECT app.enable_standard_rls('public.subcontractors');--> statement-breakpoint
SELECT app.enable_standard_rls('public.stages');--> statement-breakpoint
SELECT app.enable_standard_rls('public.tasks');--> statement-breakpoint
SELECT app.enable_standard_rls('public.material_lines');