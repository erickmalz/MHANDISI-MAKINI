CREATE TABLE "fee_invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"fee_invoice_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"received_on" date NOT NULL,
	"method" "payment_method",
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_invoice_payments_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
ALTER TABLE "fee_invoice_payments" ADD CONSTRAINT "fee_invoice_payments_fee_invoice_id_account_id_fk" FOREIGN KEY ("fee_invoice_id","account_id") REFERENCES "public"."fee_invoices"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Back-fill: every invoice already marked paid through the old one-click
-- "Mark as paid" gets one payment row for its full amount, dated the day it
-- was marked, so Fee Received (now summed from payments) is unchanged. The
-- migration role is subject to FORCE ROW LEVEL SECURITY and has no account
-- in context, so FORCE is lifted on `fee_invoices` just for this read (the
-- owner then reads every row) and restored straight after.
ALTER TABLE "fee_invoices" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "fee_invoice_payments" ("account_id", "fee_invoice_id", "amount", "received_on", "created_at")
SELECT "account_id", "id", "fee_amount", COALESCE("paid_at", "updated_at")::date, COALESCE("paid_at", "updated_at")
  FROM "fee_invoices"
 WHERE "status" = 'paid';--> statement-breakpoint
ALTER TABLE "fee_invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06). drizzle-kit
-- does not track RLS, so this block is invisible to a future `db:generate`.
SELECT app.enable_standard_rls('public.fee_invoice_payments');
