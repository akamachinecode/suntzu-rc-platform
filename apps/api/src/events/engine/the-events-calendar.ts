import {
  sighting as sightingSchema,
  type EventKind,
  type Sighting,
  type SightingFields,
} from "@workspace/shared";
import { classify } from "./classify.js";
import {
  decodeEntities,
  endAfter,
  isUrl,
  type ReadContext,
  type ReadResult,
  type SkipReason,
} from "./read.js";

// Reads The Events Calendar (WordPress, by StellarWP), the events plugin most club sites on
// WordPress run. Its public REST API, /wp-json/tribe/events/v1/events, lists upcoming events
// as JSON, a page at a time. Kept: title, dates, venue, cost, link. Descriptions and organisers
// are never read: they hold the contest director's name, phone and email.

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) =>
  typeof value === "string" ? decodeEntities(value).trim() || undefined : undefined;

/** "2026-02-05 08:00:00" is the wall-clock time at the venue: its date is the local date. */
function localDay(value: unknown): string | undefined {
  const date = text(value);
  return date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : undefined;
}

const VENUE_FIELDS = ["venue", "address", "city", "state"] as const;

function venue(value: unknown): { text: string; quote: string } | undefined {
  if (!isNode(value)) return undefined;
  const picked: Partial<Record<(typeof VENUE_FIELDS)[number], string>> = {};
  for (const key of VENUE_FIELDS) {
    const found =
      key === "state" ? (text(value.state) ?? text(value.stateprovince)) : text(value[key]);
    if (found) picked[key] = found;
  }
  const parts = Object.values(picked);
  if (!parts.length) return undefined;
  // Quote only the fields we use: a venue can also carry a phone number.
  return { text: parts.join(", "), quote: `"venue":${JSON.stringify(picked)}` };
}

type Kind =
  | { event: true; kind?: EventKind; name: string; cancelled: boolean; fromCategory?: boolean }
  | { event: false; reason: SkipReason };

/**
 * What an entry is. The title decides, as on any club calendar; when it says nothing, the
 * club's own category can: "Fly-In" gives the kind, a general "Events" (next to "Club
 * Meeting") says it is an event without saying which kind.
 */
function kindOf(title: string, categories: string[]): Kind {
  const byTitle = classify(title);
  if (byTitle.event || byTitle.reason !== "unrecognised") return byTitle;
  const name = title.trim();
  const cancelled = /\bcancell?ed\b/i.test(title);
  for (const category of categories) {
    const byCategory = classify(category);
    if (byCategory.event)
      return { event: true, kind: byCategory.kind, name, cancelled, fromCategory: true };
    if (byCategory.reason !== "unrecognised") return byCategory;
  }
  if (categories.some((category) => /\b(special )?events?\b/i.test(category))) {
    return { event: true, name, cancelled, fromCategory: true };
  }
  return byTitle;
}

export function readTheEventsCalendar(
  json: string,
  pageUrl: string,
  context: ReadContext,
): ReadResult {
  const result: ReadResult = { sightings: [], skipped: [] };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    result.skipped.push({ reason: "invalid", text: `${pageUrl}: not JSON` });
    return result;
  }
  if (!isNode(data) || !Array.isArray(data.events)) {
    result.skipped.push({ reason: "invalid", text: `${pageUrl}: no events list` });
    return result;
  }

  for (const entry of data.events) {
    if (!isNode(entry)) continue;
    const title = text(entry.title) ?? "";
    const categories = ([] as unknown[]).concat(entry.categories ?? []).flatMap((category) => {
      const name = isNode(category) ? text(category.name) : undefined;
      return name ? [name] : [];
    });
    const kind = kindOf(title, categories);
    if (!kind.event) {
      result.skipped.push({ reason: kind.reason, text: title });
      continue;
    }
    const startDate = localDay(entry.start_date);
    if (!title || !startDate) {
      result.skipped.push({ reason: "invalid", text: title || pageUrl });
      continue;
    }
    const endDate = endAfter(startDate, localDay(entry.end_date));
    const place = venue(entry.venue);
    const url = isUrl(text(entry.url)) ? text(entry.url)! : undefined;
    const cost = text(entry.cost);
    const entryFee = cost && !/^(free|0)$/i.test(cost) ? cost : undefined;

    const fields: SightingFields = {
      name: kind.name,
      ...(kind.kind && { kind: kind.kind }),
      ...(context.discipline && { discipline: context.discipline }),
      startDate,
      ...(endDate && { endDate }),
      timezone: text(entry.timezone) ?? context.timezone,
      ...(place && { placeText: place.text }),
      ...(url && { url }),
      ...(kind.cancelled && { cancelled: true }),
      ...(entryFee && { entryFee }),
    };
    const quote = (key: string) => `"${key}":${JSON.stringify(entry[key])}`;
    const evidence: Sighting["evidence"] = {
      name: quote("title"),
      ...(kind.kind && {
        kind: kind.fromCategory ? `"categories":${JSON.stringify(categories)}` : quote("title"),
      }),
      startDate: quote("start_date"),
      ...(endDate && { endDate: quote("end_date") }),
      ...(place && { placeText: place.quote }),
      ...(url && { url: quote("url") }),
      ...(kind.cancelled && { cancelled: quote("title") }),
      ...(entryFee && { entryFee: quote("cost") }),
    };

    // The global id survives a change of title or date; the URL is the fallback.
    const externalId = text(entry.global_id) ?? url ?? `${startDate}:${title}`;
    const parsed = sightingSchema.safeParse({ externalId, fields, evidence });
    if (parsed.success) result.sightings.push(parsed.data);
    else result.skipped.push({ reason: "invalid", text: title });
  }

  const next = text(data.next_rest_url);
  if (isUrl(next)) result.next = next;
  return result;
}
