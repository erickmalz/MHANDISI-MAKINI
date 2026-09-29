ALTER TYPE "public"."fee_invoice_status" ADD VALUE 'void';--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "original_fee_amount" bigint;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "correction_reason" text;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "corrected_at" timestamp with time zone;