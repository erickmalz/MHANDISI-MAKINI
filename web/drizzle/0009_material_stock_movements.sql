CREATE TYPE "public"."material_stock_movement_reason" AS ENUM('carried_forward', 'drawn_into_takeoff', 'written_off');--> statement-breakpoint
CREATE TABLE "material_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"unit" text NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"reason" "material_stock_movement_reason" NOT NULL,
	"source_stage_id" uuid,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_stock_movements_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_source_stage_id_account_id_fk" FOREIGN KEY ("source_stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_stock_movements" ADD CONSTRAINT "material_stock_movements_task_id_account_id_fk" FOREIGN KEY ("task_id","account_id") REFERENCES "public"."tasks"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern
-- 0002/0003/0006/0007/0008 use.
SELECT app.enable_standard_rls('public.material_stock_movements');