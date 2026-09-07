-- The `app` schema holds tenancy plumbing (helper functions, the RLS
-- installer, the account-provisioning trigger). The local docker image also
-- creates it in 00-roles.sql; `IF NOT EXISTS` keeps this migration runnable
-- against a bare database (CI, production) where only the three roles exist.
CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
-- Time-ordered UUID v7: 48-bit millisecond timestamp + 74 random bits, with
-- the version (7) and variant (2) bits set. Opaque and non-enumerable in URLs,
-- but index-friendly. Postgres 15/16 has no built-in uuidv7().
CREATE OR REPLACE FUNCTION app.uuid_generate_v7()
RETURNS uuid
LANGUAGE plpgsql
PARALLEL SAFE
AS $$
DECLARE
	ts_ms bytea := substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
	rnd bytea := substring(uuid_send(gen_random_uuid()) FROM 7 FOR 10);
	b bytea := ts_ms || rnd;
BEGIN
	b := set_byte(b, 6, (get_byte(b, 6) & 15) | 112);
	b := set_byte(b, 8, (get_byte(b, 8) & 63) | 128);
	RETURN encode(b, 'hex')::uuid;
END;
$$;
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT app.uuid_generate_v7() NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"accepted_terms_version" text,
	"accepted_terms_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;