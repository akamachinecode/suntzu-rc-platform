-- Searches that found nothing or little, counted per day without anything that identifies a
-- person (docs/specs/0005-search.md, slice 4). Deleted after 90 days by `pnpm notify`.
CREATE TABLE "search_misses" (
	"day" date NOT NULL,
	"words" text NOT NULL,
	"results" integer NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "search_misses_day_words_pk" PRIMARY KEY("day","words")
);
