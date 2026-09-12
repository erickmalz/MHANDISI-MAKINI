CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"payment_record_id" uuid,
	"labour_payment_id" uuid,
	"file" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"filename" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_id_account_id_key" UNIQUE("id","account_id"),
	CONSTRAINT "attachments_purchase_order_id_key" UNIQUE("purchase_order_id"),
	CONSTRAINT "attachments_payment_record_id_key" UNIQUE("payment_record_id"),
	CONSTRAINT "attachments_labour_payment_id_key" UNIQUE("labour_payment_id")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_purchase_order_id_account_id_fk" FOREIGN KEY ("purchase_order_id","account_id") REFERENCES "public"."purchase_orders"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_payment_record_id_account_id_fk" FOREIGN KEY ("payment_record_id","account_id") REFERENCES "public"."payment_records"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_labour_payment_id_account_id_fk" FOREIGN KEY ("labour_payment_id","account_id") REFERENCES "public"."labour_payments"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern
-- 0002/0003 use.
SELECT app.enable_standard_rls('public.attachments');
