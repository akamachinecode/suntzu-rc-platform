import {
  DATE_PRECISIONS,
  DISCIPLINES,
  EVENT_KINDS,
  EVENT_STATUSES,
  HOST_KINDS,
  PLACE_ACCESS,
  PLACE_KINDS,
  REGIONS,
  REGISTERS,
  REVIEW_KINDS,
  REVIEW_STATUSES,
  SOURCE_ADAPTERS,
  SOURCE_STATUSES,
  SOURCE_TRUST,
  type SightingEvidence,
  type SightingFields,
} from "@workspace/shared";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// The events engine (docs/EVENTS-ENGINE.md). Unlike notes, these tables are a public catalogue:
// rows belong to nobody, anyone may read what is published, and only the engine and the crew
// write. Sources → fetches → sightings is what the web said; events, series, places and hosts
// are what we believe; changes and reviews are how we got there.

export const eventKind = pgEnum("event_kind", EVENT_KINDS);
export const discipline = pgEnum("discipline", DISCIPLINES);
export const eventStatus = pgEnum("event_status", EVENT_STATUSES);
export const datePrecision = pgEnum("date_precision", DATE_PRECISIONS);
export const region = pgEnum("region", REGIONS);
export const placeKind = pgEnum("place_kind", PLACE_KINDS);
export const hostKind = pgEnum("host_kind", HOST_KINDS);
export const sourceAdapter = pgEnum("source_adapter", SOURCE_ADAPTERS);
export const sourceTrust = pgEnum("source_trust", SOURCE_TRUST);
export const sourceStatus = pgEnum("source_status", SOURCE_STATUSES);
export const reviewKind = pgEnum("review_kind", REVIEW_KINDS);
export const reviewStatus = pgEnum("review_status", REVIEW_STATUSES);
export const placeAccess = pgEnum("place_access", PLACE_ACCESS);
export const register = pgEnum("register", REGISTERS);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Clubs, tracks, shops, sanctioning bodies and organisers. */
export const hosts = pgTable(
  "hosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: hostKind("kind").notNull(),
    amaClubNumber: integer("ama_club_number"),
    url: text("url"),
    // Other names the web uses for this host, for matching ("AMPS").
    aliases: text("aliases").array().notNull().default([]),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    // Set when an organiser proved they run it (spec 0003): shown as "Verified".
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    // The host's own web domain ("ampsrc.com"): an organiser proves control with an email there.
    domain: text("domain"),
    summary: text("summary").notNull().default(""),
    city: text("city"),
    county: text("county"),
    disciplines: discipline("disciplines").array().notNull().default([]),
    acceptsNewcomers: boolean("accepts_newcomers").notNull().default(false),
    register: register("register").notNull().default("crew"),
    registerId: text("register_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("hosts_register_idx").on(table.register, table.registerId)],
);

/** Flying fields, tracks and venues. */
export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: placeKind("kind").notNull(),
    hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
    address: text("address"),
    city: text("city"),
    county: text("county"),
    state: text("state").notNull().default("FL"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: text("timezone").notNull().default("America/New_York"),
    // FAA-recognised identification area.
    isFria: boolean("is_fria").notNull().default(false),
    url: text("url"),
    notes: text("notes").notNull().default(""),
    aliases: text("aliases").array().notNull().default([]),
    disciplines: discipline("disciplines").array().notNull().default([]),
    access: placeAccess("access").notNull().default("unknown"),
    // Where its details come from (an FAA record, the club's page) and when someone last checked.
    register: register("register").notNull().default("crew"),
    registerId: text("register_id"),
    sourceUrl: text("source_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("places_host_id_idx").on(table.hostId),
    uniqueIndex("places_register_idx").on(table.register, table.registerId),
  ],
);

/** Airports and heliports in Florida (FAA public data), for "Can I fly here?". */
export const airports = pgTable("airports", {
  // FAA location identifier ("MIA", "X51").
  ident: text("ident").primaryKey(),
  name: text("name").notNull(),
  // "airport", "heliport", "seaplane-base"…
  kind: text("kind").notNull(),
  city: text("city"),
  state: text("state").notNull().default("FL"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  // Public use or private (only public-use airports matter for the 5-mile notice).
  publicUse: boolean("public_use").notNull().default(true),
  ...timestamps,
});

/**
 * Controlled airspace that reaches the ground (class B, C, D and E surface areas) over Florida,
 * from the FAA's public airspace data. Recreational flyers need LAANC authorisation inside it.
 */
export const airspace = pgTable("airspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  class: text("class").notNull(),
  // Lowest altitude in feet above ground (0 = reaches the surface).
  lowerFt: integer("lower_ft").notNull().default(0),
  // GeoJSON-style polygon rings: [[[lng, lat], …], …]; holes after the outer ring.
  rings: jsonb("rings").$type<number[][][]>().notNull(),
  minLat: doublePrecision("min_lat").notNull(),
  minLng: doublePrecision("min_lng").notNull(),
  maxLat: doublePrecision("max_lat").notNull(),
  maxLng: doublePrecision("max_lng").notNull(),
  ...timestamps,
});

/** Centre of each ZIP code (US Census ZCTA, public domain): "near me" without asking for GPS. */
export const zipCodes = pgTable("zip_codes", {
  zip: text("zip").primaryKey(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  state: text("state").notNull().default("FL"),
});

/** Recurring events: every edition of Jets Over Miami belongs to one series. */
export const series = pgTable("series", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: eventKind("kind").notNull(),
  discipline: discipline("discipline").notNull(),
  hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
  placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
  // 1–12, used to predict the next edition.
  usualMonth: smallint("usual_month"),
  usualTiming: text("usual_timing"),
  ...timestamps,
});

/** The source registry: anything that publishes events. */
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    adapter: sourceAdapter("adapter").notNull(),
    trust: sourceTrust("trust").notNull(),
    status: sourceStatus("status").notNull().default("candidate"),
    hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
    region: region("region"),
    checkEveryHours: integer("check_every_hours").notNull().default(168),
    // Why we may (or may not) read it automatically: robots.txt, terms, permission.
    permission: text("permission").notNull().default(""),
    // Adapter settings: feed URL, filters, selectors.
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("sources_status_idx").on(table.status)],
);

/** One row per request to a source. The raw response is kept apart (S3 in production). */
export const fetches = pgTable(
  "fetches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    httpStatus: integer("http_status"),
    contentType: text("content_type"),
    contentHash: text("content_hash"),
    etag: text("etag"),
    lastModified: text("last_modified"),
    snapshotKey: text("snapshot_key"),
    durationMs: integer("duration_ms"),
    error: text("error"),
  },
  (table) => [index("fetches_source_id_idx").on(table.sourceId, table.fetchedAt)],
);

/**
 * What one source said about one event. A sighting is written once per distinct content
 * (`fingerprint`); seeing the same content again only moves `lastSeenAt`, so the table keeps
 * every version a source published without one row per fetch.
 */
export const sightings = pgTable(
  "sightings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    // Empty for crew entries and member submissions, which aren't fetched.
    fetchId: uuid("fetch_id").references(() => fetches.id, { onDelete: "set null" }),
    externalId: text("external_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    // Copied out of `fields` so resolve can match in SQL.
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    fields: jsonb("fields").$type<SightingFields>().notNull(),
    evidence: jsonb("evidence").$type<SightingEvidence>().notNull().default({}),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sightings_source_version_idx").on(
      table.sourceId,
      table.externalId,
      table.fingerprint,
    ),
    index("sightings_start_date_idx").on(table.startDate),
  ],
);

/** Canonical events: what we publish. */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Stays the same through the whole lifecycle, so the page keeps its search value.
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: eventKind("kind").notNull(),
    discipline: discipline("discipline").notNull(),
    status: eventStatus("status").notNull().default("announced"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    datePrecision: datePrecision("date_precision").notNull().default("day"),
    dateText: text("date_text"),
    timezone: text("timezone").notNull().default("America/New_York"),
    region: region("region").notNull(),
    seriesId: uuid("series_id").references(() => series.id, { onDelete: "set null" }),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    placeText: text("place_text"),
    hostId: uuid("host_id").references(() => hosts.id, { onDelete: "set null" }),
    summary: text("summary").notNull().default(""),
    url: text("url"),
    sanctions: text("sanctions").array().notNull().default([]),
    classes: text("classes").array().notNull().default([]),
    entryFee: text("entry_fee"),
    entryUrl: text("entry_url"),
    resultsUrl: text("results_url"),
    // AMA membership, FAA TRUST certificate, landing fee…
    requirements: text("requirements").array().notNull().default([]),
    // Welcomes newcomers: set by the crew or the organiser, shown as a filter and a badge.
    beginnerFriendly: boolean("beginner_friendly").notNull().default(false),
    confidence: real("confidence").notNull().default(0),
    // Empty while the event waits in the review queue.
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // The crew said it isn't a real RC event: it stays hidden, and resolve keeps linking new
    // sightings of it here so it never comes back as "new".
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("events_start_date_idx").on(table.startDate),
    index("events_series_id_idx").on(table.seriesId),
    index("events_place_id_idx").on(table.placeId),
  ],
);

/** Which sightings back which event. */
export const eventSightings = pgTable(
  "event_sightings",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sightingId: uuid("sighting_id")
      .notNull()
      .references(() => sightings.id, { onDelete: "cascade" }),
    matchScore: real("match_score").notNull().default(1),
    // "engine" or "crew".
    linkedBy: text("linked_by").notNull().default("engine"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.sightingId] }),
    index("event_sightings_sighting_id_idx").on(table.sightingId),
  ],
);

/** Field-level history of every event: the change log and the source of alerts. */
export const changes = pgTable(
  "changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    sightingId: uuid("sighting_id").references(() => sightings.id, { onDelete: "set null" }),
    // "engine", "crew" or "seed".
    changedBy: text("changed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("changes_event_id_idx").on(table.eventId, table.createdAt)],
);

/** The crew's review queue. Every decision is kept: it is the engine's feedback. */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: reviewKind("kind").notNull(),
    status: reviewStatus("status").notNull().default("open"),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    sightingId: uuid("sighting_id").references(() => sightings.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "cascade" }),
    // What the engine proposes (fields to set, events to merge).
    proposal: jsonb("proposal").$type<Record<string, unknown>>().notNull().default({}),
    note: text("note").notNull().default(""),
    // The member who suggested it (corrections, submissions); credited, never shown publicly.
    submittedBy: text("submitted_by").references(() => user.id, { onDelete: "set null" }),
    reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_status_idx").on(table.status, table.createdAt)],
);

export type Host = typeof hosts.$inferSelect;
export type NewHost = typeof hosts.$inferInsert;
export type Airport = typeof airports.$inferSelect;
export type Airspace = typeof airspace.$inferSelect;
export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Fetch = typeof fetches.$inferSelect;
export type Sighting = typeof sightings.$inferSelect;
export type NewSighting = typeof sightings.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Change = typeof changes.$inferSelect;
export type Review = typeof reviews.$inferSelect;
