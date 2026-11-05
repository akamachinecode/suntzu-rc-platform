import { createHash } from "node:crypto";
import type { Discipline, Sighting, SightingFields } from "@workspace/shared";

// What every reader (ICS, JSON-LD…) returns, and the small helpers they share.

export interface ReadContext {
  /** Discipline of everything this source publishes, when it only publishes one. */
  discipline?: Discipline;
  /** Time zone used to turn UTC instants into the local date of the event. */
  timezone: string;
}

/** Why an entry in a source did not become a sighting. */
export type SkipReason =
  | "notice" // field closed, no flying: kept apart for "conditions" later
  | "club-business" // meetings, dues, work days
  | "practice"
  | "recurring" // repeating entries (practice days, monthly BBQ)
  | "unrecognised"
  | "invalid";

export interface ReadResult {
  sightings: Sighting[];
  skipped: { reason: SkipReason; text: string }[];
}

/** Same fields, same fingerprint: lets the engine store each version of a sighting once. */
export function fingerprint(fields: SightingFields): string {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

/** The calendar date (YYYY-MM-DD) an instant falls on in a time zone. */
export function localDate(instant: Date, timezone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** An end date only when it adds something: after the start. */
export function endAfter(start: string, end: string | undefined): string | undefined {
  return end && end > start ? end : undefined;
}

export function isUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
