CREATE TYPE "public"."place_access" AS ENUM('public', 'guests', 'members', 'permission', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."register" AS ENUM('faa-fria', 'faa-fixed-site', 'crew', 'organiser');--> statement-breakpoint
CREATE TABLE "airports" (
	"ident" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"city" text,
	"state" text DEFAULT 'FL' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"public_use" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"lower_ft" integer DEFAULT 0 NOT NULL,
	"rings" jsonb NOT NULL,
	"min_lat" double precision NOT NULL,
	"min_lng" double precision NOT NULL,
	"max_lat" double precision NOT NULL,
	"max_lng" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zip_codes" (
	"zip" text PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"state" text DEFAULT 'FL' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "county" text;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "disciplines" "discipline"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "accepts_newcomers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "register" "register" DEFAULT 'crew' NOT NULL;--> statement-breakpoint
ALTER TABLE "hosts" ADD COLUMN "register_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "disciplines" "discipline"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "access" "place_access" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "register" "register" DEFAULT 'crew' NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "register_id" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "hosts_register_idx" ON "hosts" USING btree ("register","register_id");--> statement-breakpoint
CREATE UNIQUE INDEX "places_register_idx" ON "places" USING btree ("register","register_id");