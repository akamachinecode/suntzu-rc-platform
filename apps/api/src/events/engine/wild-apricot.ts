import { sighting as sightingSchema, type Sighting, type SightingFields } from "@workspace/shared";
import { classify } from "./classify.js";
import {
  decodeEntities,
  endAfter,
  isUrl,
  localDate,
  type ReadContext,
  type ReadResult,
} from "./read.js";

// Reads the events feed every Wild Apricot site publishes (https://<club>/events/RSS): one
// item per upcoming event, its title ending in the date, "Monthly Meeting (11/14/2026)", and
// the start as pubDate. The feed has no place; descriptions are not kept (they are member
// notes and can name people).

/** The first <tag>…</tag> of an XML fragment, as the source wrote it and as text. */
function element(xml: string, tag: string): { raw: string; value: string } | undefined {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  if (!match) return undefined;
  const inner = match[1]!.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
  return { raw: match[0], value: decodeEntities(inner).replace(/\s+/g, " ").trim() };
}

/** "11/14/2026" → "2026-11-14". */
function usDate(value: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, month, day, year] = match;
  const date = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  return Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()) ? undefined : date;
}

// "Name (11/14/2026)" or "Name (12/5/2026 - 12/6/2026)" for an event over several days.
const TITLE_DATES = /\s*\((\d{1,2}\/\d{1,2}\/\d{4})(?:\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4}))?\)\s*$/;

export function readWildApricot(xml: string, pageUrl: string, context: ReadContext): ReadResult {
  const result: ReadResult = { sightings: [], skipped: [] };
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]!);
  if (!items.length && !/<rss\b/i.test(xml)) {
    result.skipped.push({ reason: "invalid", text: `${pageUrl}: not an RSS feed` });
    return result;
  }

  for (const item of items) {
    const title = element(item, "title");
    if (!title?.value) continue;
    const dates = TITLE_DATES.exec(title.value);
    const name = dates ? title.value.slice(0, dates.index).trim() : title.value;
    // Club calendars mix events with meetings and work parties, as Google Calendars do.
    const kind = classify(name);
    if (!kind.event) {
      result.skipped.push({ reason: kind.reason, text: name });
      continue;
    }

    // The date in the title is the club's local date; pubDate (UTC) is the fallback.
    const pubDate = element(item, "pubDate");
    const instant = pubDate && new Date(pubDate.value);
    const startDate =
      (dates && usDate(dates[1]!)) ??
      (instant && !Number.isNaN(instant.getTime())
        ? localDate(instant, context.timezone)
        : undefined);
    if (!startDate) {
      result.skipped.push({ reason: "invalid", text: name });
      continue;
    }
    const endDate = endAfter(startDate, dates?.[2] && usDate(dates[2]));
    const link = element(item, "link")?.value;
    const url = isUrl(link) ? link : undefined;

    const fields: SightingFields = {
      name: kind.name,
      kind: kind.kind,
      ...(context.discipline && { discipline: context.discipline }),
      startDate,
      ...(endDate && { endDate }),
      timezone: context.timezone,
      ...(url && { url }),
      ...(kind.cancelled && { cancelled: true }),
    };
    const evidence: Sighting["evidence"] = {
      name: title.raw,
      startDate: dates ? title.raw : pubDate!.raw,
      ...(endDate && { endDate: title.raw }),
      ...(url && { url: element(item, "link")!.raw }),
      ...(kind.cancelled && { cancelled: title.raw }),
    };

    // Wild Apricot's event address ("https://club/event-6487789") is stable for the event.
    const guid = element(item, "guid")?.value;
    const externalId = guid || url || `${startDate}:${name}`;
    const parsed = sightingSchema.safeParse({ externalId, fields, evidence });
    if (parsed.success) result.sightings.push(parsed.data);
    else result.skipped.push({ reason: "invalid", text: name });
  }
  return result;
}
