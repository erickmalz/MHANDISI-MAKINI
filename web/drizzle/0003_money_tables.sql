CREATE TYPE "public"."document_number_type" AS ENUM('funding_request', 'purchase_order', 'fee_invoice');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'mobile_money', 'cheque', 'other');--> statement-breakpoint
CREATE TYPE "public"."funding_request_kind" AS ENUM('base', 'additional');--> statement-breakpoint
CREATE TYPE "public"."funding_request_status" AS ENUM('draft', 'issued', 'superseded', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."funding_line_category" AS ENUM('material', 'labour', 'fee', 'other');--> statement-breakpoint
CREATE TYPE "public"."fee_invoice_status" AS ENUM('issued', 'paid');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('planned', 'ordered', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."supplier_payment_kind" AS ENUM('deposit', 'partial', 'final');--> statement-breakpoint
CREATE TABLE "document_number_sequences" (
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "document_number_type" NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "document_number_sequences_project_id_type_pk" PRIMARY KEY("project_id","type")
);
--> statement-breakpoint
CREATE TABLE "funding_requests" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"kind" "funding_request_kind" DEFAULT 'base' NOT NULL,
	"status" "funding_request_status" DEFAULT 'draft' NOT NULL,
	"base_number" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"display_number" text,
	"supersedes_id" uuid,
	"revision_reason" text,
	"cancel_reason" text,
	"notes" text,
	"payment_instructions" text,
	"document_snapshot" jsonb,
	"issued_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_requests_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "funding_request_lines" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"category" "funding_line_category" NOT NULL,
	"seq" integer NOT NULL,
	"item" text NOT NULL,
	"description" text,
	"qty" numeric(14, 3),
	"unit" text,
	"unit_cost" bigint,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_request_lines_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "fee_invoices" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"status" "fee_invoice_status" DEFAULT 'issued' NOT NULL,
	"base_number" integer NOT NULL,
	"display_number" text NOT NULL,
	"is_delta" boolean DEFAULT false NOT NULL,
	"parent_fee_invoice_id" uuid,
	"fee_basis" "fee_basis" NOT NULL,
	"fee_percent" numeric(5, 2),
	"basis_value" bigint,
	"fee_amount" bigint NOT NULL,
	"payment_instructions" text,
	"document_snapshot" jsonb NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_invoices_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"received_on" date NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"notes" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deposits_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"supplier_id" uuid,
	"status" "purchase_order_status" DEFAULT 'planned' NOT NULL,
	"base_number" integer,
	"display_number" text,
	"expected_delivery_on" date,
	"payment_terms" text,
	"notes" text,
	"supplier_ack_note" text,
	"supplier_ack_on" date,
	"cancel_reason" text,
	"document_snapshot" jsonb,
	"ordered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"reopened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"item" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"qty_ordered" numeric(14, 3) NOT NULL,
	"unit_price" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_lines_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_record_lines" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"delivery_record_id" uuid NOT NULL,
	"purchase_order_line_id" uuid NOT NULL,
	"qty_delivered" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_accepted" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_rejected" numeric(14, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_record_lines_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_records" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"delivered_on" date NOT NULL,
	"note_number" text,
	"site_notes" text,
	"over_delivery_reason" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_records_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"paid_on" date NOT NULL,
	"amount" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"kind" "supplier_payment_kind",
	"over_payment_reason" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "labour_payments" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"notes" text,
	"is_retention_release" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labour_payments_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "petty_cash_expenses" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_id" uuid,
	"description" text NOT NULL,
	"amount" bigint NOT NULL,
	"spent_on" date NOT NULL,
	"category" text,
	"receipt_ref" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petty_cash_expenses_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
CREATE TABLE "other_commitments" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" bigint NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"approved_on" date NOT NULL,
	"notes" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "other_commitments_id_account_id_key" UNIQUE("id","account_id")
);
--> statement-breakpoint
ALTER TABLE "document_number_sequences" ADD CONSTRAINT "document_number_sequences_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_supersedes_id_account_id_fk" FOREIGN KEY ("supersedes_id","account_id") REFERENCES "public"."funding_requests"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_request_lines" ADD CONSTRAINT "funding_request_lines_funding_request_id_account_id_fk" FOREIGN KEY ("funding_request_id","account_id") REFERENCES "public"."funding_requests"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_funding_request_id_account_id_fk" FOREIGN KEY ("funding_request_id","account_id") REFERENCES "public"."funding_requests"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_parent_fee_invoice_id_account_id_fk" FOREIGN KEY ("parent_fee_invoice_id","account_id") REFERENCES "public"."fee_invoices"("id","account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_funding_request_id_account_id_fk" FOREIGN KEY ("funding_request_id","account_id") REFERENCES "public"."funding_requests"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_account_id_fk" FOREIGN KEY ("purchase_order_id","account_id") REFERENCES "public"."purchase_orders"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_record_lines" ADD CONSTRAINT "delivery_record_lines_delivery_record_id_account_id_fk" FOREIGN KEY ("delivery_record_id","account_id") REFERENCES "public"."delivery_records"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_record_lines" ADD CONSTRAINT "delivery_record_lines_purchase_order_line_id_account_id_fk" FOREIGN KEY ("purchase_order_line_id","account_id") REFERENCES "public"."purchase_order_lines"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_purchase_order_id_account_id_fk" FOREIGN KEY ("purchase_order_id","account_id") REFERENCES "public"."purchase_orders"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_purchase_order_id_account_id_fk" FOREIGN KEY ("purchase_order_id","account_id") REFERENCES "public"."purchase_orders"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labour_payments" ADD CONSTRAINT "labour_payments_task_id_account_id_fk" FOREIGN KEY ("task_id","account_id") REFERENCES "public"."tasks"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_expenses" ADD CONSTRAINT "petty_cash_expenses_project_id_account_id_fk" FOREIGN KEY ("project_id","account_id") REFERENCES "public"."projects"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "other_commitments" ADD CONSTRAINT "other_commitments_stage_id_account_id_fk" FOREIGN KEY ("stage_id","account_id") REFERENCES "public"."stages"("id","account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Standard tenant-isolation treatment (multi-tenancy ticket 06): ENABLE +
-- FORCE ROW LEVEL SECURITY + one identical `account_isolation` policy keyed on
-- `account_id = app.current_account_id()`. drizzle-kit does not track RLS, so
-- this block is invisible to a future `db:generate`. Same merge pattern 0002
-- uses.
SELECT app.enable_standard_rls('public.document_number_sequences');--> statement-breakpoint
SELECT app.enable_standard_rls('public.funding_requests');--> statement-breakpoint
SELECT app.enable_standard_rls('public.funding_request_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.fee_invoices');--> statement-breakpoint
SELECT app.enable_standard_rls('public.deposits');--> statement-breakpoint
SELECT app.enable_standard_rls('public.purchase_orders');--> statement-breakpoint
SELECT app.enable_standard_rls('public.purchase_order_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.delivery_records');--> statement-breakpoint
SELECT app.enable_standard_rls('public.delivery_record_lines');--> statement-breakpoint
SELECT app.enable_standard_rls('public.payment_records');--> statement-breakpoint
SELECT app.enable_standard_rls('public.labour_payments');--> statement-breakpoint
SELECT app.enable_standard_rls('public.petty_cash_expenses');--> statement-breakpoint
SELECT app.enable_standard_rls('public.other_commitments');