import { z } from "zod";

// The events engine's vocabulary and shapes (see docs/EVENTS-ENGINE.md and docs/ROADMAP.md).
// packages/db builds its PostgreSQL enums from these lists, so a value is added in one place.

export const EVENT_KINDS = [
  "fly-in",
  "competition",
  "race",
  "show",
  "swap-meet",
  "open-day",
  "course",
  "other",
] as const;
export const DISCIPLINES = ["air", "rotor", "ground", "fpv"] as const;
// expected: predicted from the series, not announced. "Changed" lives in the change log and
// results in `resultsUrl`, so neither is a status.
export const EVENT_STATUSES = ["expected", "announced", "confirmed", "cancelled", "held"] as const;
// How exact `startDate` is: "month" stores the first of the usual month so lists still sort.
export const DATE_PRECISIONS = ["day", "month"] as const;
export const REGIONS = ["south-florida", "florida", "road-trip"] as const;
export const PLACE_KINDS = ["flying-field", "car-track", "indoor", "venue"] as const;
export const HOST_KINDS = ["club", "track", "shop", "sanctioning-body", "organiser"] as const;
// How a visitor may use a place. "permission": ask the owner or club first (most FAA-recognised
// club fields); "unknown": nobody has told us yet.
export const PLACE_ACCESS = ["public", "guests", "members", "permission", "unknown"] as const;
// Public registers a place or host can come from, so imports can run again without duplicates.
export const REGISTERS = ["faa-fria", "faa-fixed-site", "crew", "organiser"] as const;
export const AIRSPACE_CLASSES = ["B", "C", "D", "E"] as const;
// How the engine reads a source. "manual" is the crew typing, "submission" a member's form.
export const SOURCE_ADAPTERS = ["ics", "json-ld", "html", "api", "manual", "submission"] as const;
// Who is speaking, most trusted first. Verify turns this into a weight.
export const SOURCE_TRUST = ["organiser", "sanctioning-body", "aggregator", "community"] as const;
// candidate: found, not yet approved to read. blocked: terms or robots.txt say no.
export const SOURCE_STATUSES = ["candidate", "active", "paused", "broken", "blocked"] as const;
export const REVIEW_KINDS = ["new-event", "merge", "change", "disappeared", "new-source"] as const;
export const REVIEW_STATUSES = ["open", "approved", "corrected", "rejected"] as const;

export const eventKind = z.enum(EVENT_KINDS);
export const discipline = z.enum(DISCIPLINES);
export const eventStatus = z.enum(EVENT_STATUSES);
export const datePrecision = z.enum(DATE_PRECISIONS);
export const region = z.enum(REGIONS);
export const placeKind = z.enum(PLACE_KINDS);
export const hostKind = z.enum(HOST_KINDS);
export const placeAccess = z.enum(PLACE_ACCESS);
export const register = z.enum(REGISTERS);
export const airspaceClass = z.enum(AIRSPACE_CLASSES);
export const sourceAdapter = z.enum(SOURCE_ADAPTERS);
export const sourceTrust = z.enum(SOURCE_TRUST);

/**
 * What an extractor reads about one event in one source: a sighting. Every field except `name`
 * and `startDate` is optional, and `evidence` holds the source text behind each field. AI
 * extraction drops any field it can't quote.
 */
export const sightingFields = z.object({
  name: z.string().trim().min(1),
  kind: eventKind.optional(),
  discipline: discipline.optional(),
  startDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  timezone: z.string().optional(),
  placeText: z.string().trim().optional(),
  hostText: z.string().trim().optional(),
  url: z.url().optional(),
  summary: z.string().trim().optional(),
  cancelled: z.boolean().optional(),
  sanctions: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  entryFee: z.string().optional(),
  entryUrl: z.url().optional(),
});

export const sightingField = sightingFields.keyof();
export const sightingEvidence = z.partialRecord(sightingField, z.string().trim().min(1));

export const sighting = z.object({
  // Stable id of the event inside its source (ICS UID, page URL); repeats across fetches.
  externalId: z.string().min(1),
  fields: sightingFields,
  evidence: sightingEvidence,
});

export const placeSummary = z.object({
  slug: z.string(),
  name: z.string(),
  kind: placeKind,
  address: z.string().nullable(),
  city: z.string().nullable(),
  county: z.string().nullable(),
  state: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  // FAA-recognised identification area: drones without Remote ID may fly there.
  isFria: z.boolean(),
  url: z.url().nullable(),
});

export const hostSummary = z.object({
  slug: z.string(),
  name: z.string(),
  kind: hostKind,
  url: z.url().nullable(),
});

export const event = z.object({
  slug: z.string(),
  name: z.string(),
  kind: eventKind,
  discipline,
  status: eventStatus,
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  datePrecision,
  // How the date reads when it isn't exact, e.g. "Usually February".
  dateText: z.string().nullable(),
  timezone: z.string(),
  region,
  place: placeSummary.nullable(),
  // Where it happens when we don't know the venue yet, e.g. "Orlando, FL".
  placeText: z.string().nullable(),
  host: hostSummary.nullable(),
  summary: z.string(),
  url: z.url().nullable(),
  sanctions: z.array(z.string()),
  classes: z.array(z.string()),
  entryFee: z.string().nullable(),
  entryUrl: z.url().nullable(),
  resultsUrl: z.url().nullable(),
  requirements: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  lastCheckedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});

/** One source behind an event, shown on its page so people can check it themselves. */
export const eventSource = z.object({
  name: z.string(),
  trust: sourceTrust,
  // The crew's hand-checked calendar rather than a page the engine read.
  byCrew: z.boolean(),
  // The page that said it.
  url: z.url().nullable(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
});

export const eventDetail = event.extend({ sources: z.array(eventSource) });

export const place = placeSummary.extend({
  notes: z.string(),
  host: hostSummary.nullable(),
});

export const eventListQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  discipline: discipline.optional(),
  kind: eventKind.optional(),
  region: region.optional(),
});

/** Filters of a calendar feed (ICS): the same as the list, always from today on. */
export const calendarQuery = eventListQuery.pick({ discipline: true, kind: true, region: true });

export type EventKind = z.output<typeof eventKind>;
export type Discipline = z.output<typeof discipline>;
export type EventStatus = z.output<typeof eventStatus>;
export type Region = z.output<typeof region>;
export type SourceTrust = z.output<typeof sourceTrust>;
export type PlaceAccess = z.output<typeof placeAccess>;
export type SightingFields = z.output<typeof sightingFields>;
export type SightingEvidence = z.output<typeof sightingEvidence>;
export type Sighting = z.output<typeof sighting>;
export type PlaceSummary = z.output<typeof placeSummary>;
export type HostSummary = z.output<typeof hostSummary>;
export type RcEvent = z.output<typeof event>;
export type EventListQuery = z.output<typeof eventListQuery>;
export type CalendarQuery = z.output<typeof calendarQuery>;
export type EventSource = z.output<typeof eventSource>;
export type EventDetail = z.output<typeof eventDetail>;
export type Place = z.output<typeof place>;
