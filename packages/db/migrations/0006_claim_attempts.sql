ALTER TABLE "host_members" ADD COLUMN "code_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "host_members" ADD COLUMN "code_attempts" integer DEFAULT 0 NOT NULL;