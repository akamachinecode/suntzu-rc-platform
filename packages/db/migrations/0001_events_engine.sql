CREATE TYPE "public"."date_precision" AS ENUM('day', 'month');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('air', 'rotor', 'ground', 'fpv');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('fly-in', 'competition', 'race', 'show', 'swap-meet', 'open-day', 'course', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('expected', 'announced', 'confirmed', 'cancelled', 'held');--> statement-breakpoint
CREATE TYPE "public"."host_kind" AS ENUM('club', 'track', 'shop', 'sanctioning-body', 'organiser');--> statement-breakpoint
CREATE TYPE "public"."place_kind" AS ENUM('flying-field', 'car-track', 'indoor', 'venue');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('south-florida', 'florida', 'road-trip');--> statement-breakpoint
CREATE TYPE "public"."review_kind" AS ENUM('new-event', 'merge', 'change', 'disappeared', 'new-source');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('open', 'approved', 'corrected', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_adapter" AS ENUM('ics', 'json-ld', 'html', 'api', 'manual', 'submission');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('candidate', 'active', 'paused', 'broken', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."source_trust" AS ENUM('organiser', 'sanctioning-body', 'aggregator', 'community');--> statement-breakpoint
CREATE TABLE "changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"sighting_id" uuid,
	"changed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_sightings" (
	"event_id" uuid NOT NULL,
	"sighting_id" uuid NOT NULL,
	"match_score" real DEFAULT 1 NOT NULL,
	"linked_by" text DEFAULT 'engine' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_sightings_event_id_sighting_id_pk" PRIMARY KEY("event_id","sighting_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "event_kind" NOT NULL,
	"discipline" "discipline" NOT NULL,
	"status" "event_status" DEFAULT 'announced' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"date_precision" date_precision DEFAULT 'day' NOT NULL,
	"date_text" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"region" "region" NOT NULL,
	"series_id" uuid,
	"place_id" uuid,
	"place_text" text,
	"host_id" uuid,
	"summary" text DEFAULT '' NOT NULL,
	"url" text,
	"sanctions" text[] DEFAULT '{}' NOT NULL,
	"classes" text[] DEFAULT '{}' NOT NULL,
	"entry_fee" text,
	"entry_url" text,
	"results_url" text,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"http_status" integer,
	"content_type" text,
	"content_hash" text,
	"etag" text,
	"last_modified" text,
	"snapshot_key" text,
	"duration_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "host_kind" NOT NULL,
	"ama_club_number" integer,
	"url" text,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hosts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "place_kind" NOT NULL,
	"host_id" uuid,
	"address" text,
	"city" text,
	"county" text,
	"state" text DEFAULT 'FL' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"is_fria" boolean DEFAULT false NOT NULL,
	"url" text,
	"notes" text DEFAULT '' NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "review_kind" NOT NULL,
	"status" "review_status" DEFAULT 'open' NOT NULL,
	"event_id" uuid,
	"sighting_id" uuid,
	"source_id" uuid,
	"proposal" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"reviewer_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "event_kind" NOT NULL,
	"discipline" "discipline" NOT NULL,
	"host_id" uuid,
	"place_id" uuid,
	"usual_month" smallint,
	"usual_timing" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sightings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"fetch_id" uuid,
	"external_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"fields" jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"adapter" "source_adapter" NOT NULL,
	"trust" "source_trust" NOT NULL,
	"status" "source_status" DEFAULT 'candidate' NOT NULL,
	"host_id" uuid,
	"region" "region",
	"check_every_hours" integer DEFAULT 168 NOT NULL,
	"permission" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_sighting_id_sightings_id_fk" FOREIGN KEY ("sighting_id") REFERENCES "public"."sightings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sightings" ADD CONSTRAINT "event_sightings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sightings" ADD CONSTRAINT "event_sightings_sighting_id_sightings_id_fk" FOREIGN KEY ("sighting_id") REFERENCES "public"."sightings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetches" ADD CONSTRAINT "fetches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sighting_id_sightings_id_fk" FOREIGN KEY ("sighting_id") REFERENCES "public"."sightings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_fetch_id_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."fetches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changes_event_id_idx" ON "changes" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "event_sightings_sighting_id_idx" ON "event_sightings" USING btree ("sighting_id");--> statement-breakpoint
CREATE INDEX "events_start_date_idx" ON "events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "events_series_id_idx" ON "events" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "events_place_id_idx" ON "events" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "fetches_source_id_idx" ON "fetches" USING btree ("source_id","fetched_at");--> statement-breakpoint
CREATE INDEX "places_host_id_idx" ON "places" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sightings_source_version_idx" ON "sightings" USING btree ("source_id","external_id","fingerprint");--> statement-breakpoint
CREATE INDEX "sightings_start_date_idx" ON "sightings" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");