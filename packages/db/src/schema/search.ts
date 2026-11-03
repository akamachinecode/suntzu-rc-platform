import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Search across the whole site (docs/specs/0005-search.md). One row per thing a visitor can find:
// an event, a place, a club, a guide, a rule or a service. Like events, a public catalogue that
// belongs to nobody. Events, places and clubs are written by database triggers whenever their row
// changes (migration 0008), so search never disagrees with the pages; guides, rules and services
// come from @workspace/shared and are written by the API when it starts.
//
// Migration 0008 also adds two generated columns that Drizzle doesn't model: `tsv` (the words,
// weighted title > subtitle > text) and `title_norm` (the title without accents or punctuation,
// for typos), and the `search_words` view of every word on the site, to correct misspellings.
export const searchDocuments = pgTable(
  "search_documents",
  {
    // "<type>:<row id>" for events, places and clubs; "<type>:<content id>" for the rest.
    id: text("id").primaryKey(),
    // event · place · club · guide · rule · service
    type: text("type").notNull(),
    title: text("title").notNull(),
    // Shown under the title: kind, place, town.
    subtitle: text("subtitle").notNull().default(""),
    // Searched but not shown: summary, aliases, club, classes, notes.
    body: text("body").notNull().default(""),
    url: text("url").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // Events only: first and last day (an event known only by month lasts the month).
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    // How much this kind of result is worth when the words match equally well.
    weight: real("weight").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("search_documents_type_idx").on(table.type)],
);

// Searches that found nothing or little, counted per day (spec 0005, slice 4): the normalised
// words and how many results they got, never the account, IP address, location or device. Text
// that looks like an email, a phone number or a street address is never written. Rows older than
// 90 days are deleted by the scheduled clean-up (`pnpm notify`).
export const searchMisses = pgTable(
  "search_misses",
  {
    // A Florida date.
    day: date("day").notNull(),
    words: text("words").notNull(),
    // Results the last time it was searched that day.
    results: integer("results").notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.day, table.words] })],
);
