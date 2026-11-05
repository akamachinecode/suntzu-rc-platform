import { sighting as sightingSchema, type Sighting, type SightingFields } from "@workspace/shared";
import { classify } from "./classify.js";
import { endAfter, htmlText, isUrl, type ReadContext, type ReadResult } from "./read.js";

// Reads a schedule laid out as an HTML table: a row with the year ("2026"), then one row per
// event with its dates, name (often a link to the event) and town, in that order. Extreme
// Flight's event schedule is built this way, and so are many hand-made club pages. Every row
// is an event (a schedule lists nothing else), so a name without a known kind is kept.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface Cell {
  html: string;
  text: string;
}

function cells(row: string): Cell[] {
  return [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, html]) => ({
    html: html!,
    text: htmlText(html!),
  }));
}

function month(name: string | undefined): number | undefined {
  const index = name ? MONTHS.indexOf(name.slice(0, 3).toLowerCase()) : -1;
  return index >= 0 ? index + 1 : undefined;
}

const day = (year: number, monthNumber: number, dayNumber: number) => {
  const date = new Date(Date.UTC(year, monthNumber - 1, dayNumber));
  // Feb 30 rolls over to March: not a date.
  return date.getUTCMonth() === monthNumber - 1 ? date.toISOString().slice(0, 10) : undefined;
};

// "Mar 7", "Feb 19 - Feb 22", "Oct 14 - 18", "Sept 5th – 7th", "Dec 30 - Jan 2".
const DATES =
  /^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–—]\s*(?:([a-z]{3,9})\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?$/i;

/** The start and end date of a cell such as "Feb 19 - Feb 22", in the given year. */
export function scheduleDates(
  value: string,
  year: number,
): { startDate: string; endDate?: string } | undefined {
  const match = DATES.exec(value.trim());
  if (!match) return undefined;
  const [, startMonthName, startDay, endMonthName, endDay] = match;
  const startMonth = month(startMonthName);
  const startDate = startMonth && day(year, startMonth, Number(startDay));
  if (!startMonth || !startDate) return undefined;
  if (!endDay) return { startDate };
  const endMonth = endMonthName ? month(endMonthName) : startMonth;
  if (!endMonth) return undefined;
  // "Dec 30 - Jan 2" ends in the next year.
  const endYear = endMonth < startMonth ? year + 1 : year;
  const endDate = day(endYear, endMonth, Number(endDay));
  return endDate ? { startDate, ...(endAfter(startDate, endDate) && { endDate }) } : undefined;
}

function firstLink(html: string, pageUrl: string): string | undefined {
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(href!.replace(/&amp;/g, "&"), pageUrl).toString();
      if (isUrl(url)) return url;
    } catch {
      // Not a link we can follow.
    }
  }
  return undefined;
}

export function readScheduleTable(html: string, pageUrl: string, context: ReadContext): ReadResult {
  const result: ReadResult = { sightings: [], skipped: [] };
  let year: number | undefined;

  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const [dateCell, nameCell, placeCell] = cells(row!);
    if (!dateCell) continue;
    // A year heading: "2026" alone in the row.
    if (/^(19|20)\d{2}$/.test(dateCell.text) && !nameCell?.text) {
      year = Number(dateCell.text);
      continue;
    }
    if (!nameCell?.text) continue;
    const name = nameCell.text;
    const dates = year ? scheduleDates(dateCell.text, year) : undefined;
    if (!dates) {
      result.skipped.push({ reason: "invalid", text: `${dateCell.text} ${name}` });
      continue;
    }
    const kind = classify(name);
    const placeText = placeCell?.text || undefined;
    // The name's link is the event's own page (a flyer, a club page, a Facebook event).
    const url = firstLink(nameCell.html, pageUrl);

    const fields: SightingFields = {
      name: kind.event ? kind.name : name,
      ...(kind.event && { kind: kind.kind }),
      ...(context.discipline && { discipline: context.discipline }),
      ...dates,
      timezone: context.timezone,
      ...(placeText && { placeText }),
      ...(url && { url }),
      ...(kind.event && kind.cancelled && { cancelled: true }),
    };
    const evidence: Sighting["evidence"] = {
      name,
      startDate: `${year} · ${dateCell.text}`,
      ...(dates.endDate && { endDate: `${year} · ${dateCell.text}` }),
      ...(placeText && { placeText }),
      ...(url && { url }),
      ...(kind.event && kind.cancelled && { cancelled: name }),
    };

    // Same event, same row: the year and the name, so a moved date is a new version of it.
    const externalId = `${pageUrl}#${year}:${name}`;
    const parsed = sightingSchema.safeParse({ externalId, fields, evidence });
    if (parsed.success) result.sightings.push(parsed.data);
    else result.skipped.push({ reason: "invalid", text: name });
  }
  return result;
}
