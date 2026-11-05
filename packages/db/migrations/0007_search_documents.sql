CREATE TABLE "search_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"starts_on" date,
	"ends_on" date,
	"weight" real DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "search_documents_type_idx" ON "search_documents" USING btree ("type");