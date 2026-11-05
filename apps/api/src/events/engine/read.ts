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
  | "elsewhere" // outside the area the source is read for (`onlyPlaces`)
  | "unrecognised"
  | "invalid";

export interface ReadResult {
  sightings: Sighting[];
  skipped: { reason: SkipReason; text: string }[];
  /** The next page of a paged source (an API's next page), when there is one. */
  next?: string;
}

/** Keeps the sightings whose place matches; the others are skipped as "elsewhere". */
export function onlyPlaces(result: ReadResult, pattern: RegExp): ReadResult {
  const kept: ReadResult = { ...result, sightings: [], skipped: [...result.skipped] };
  for (const found of result.sightings) {
    const place = found.fields.placeText;
    // A sighting that doesn't say where stays: resolve and the crew can still place it.
    if (!place || pattern.test(place)) kept.sightings.push(found);
    else kept.skipped.push({ reason: "elsewhere", text: `${found.fields.name} (${place})` });
  }
  return kept;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

/** Turns HTML/XML character references (&amp;, &#39;, &#x27;) back into text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[ref.toLowerCase()] ?? match;
  });
}

/** The visible text of an HTML fragment, on one line. */
export function htmlText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
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
