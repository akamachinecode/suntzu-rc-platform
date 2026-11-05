import { sighting as sightingSchema, type Sighting, type SightingFields } from "@workspace/shared";
import { classify } from "./classify.js";
import { addDays, endAfter, isUrl, localDate, type ReadContext, type ReadResult } from "./read.js";

// Reads iCalendar feeds (RFC 5545), the format behind every public Google Calendar. Only the
// parts the engine needs: events, their dates, title, place and link. Descriptions are not
// kept: they often hold organisers' names, phones and emails.

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
  /** The line as it appears in the feed, kept as evidence. */
  raw: string;
}

export interface IcsEvent {
  properties: Map<string, Property>;
  recurring: boolean;
}

export interface IcsCalendar {
  timezone?: string;
  events: IcsEvent[];
}

function parseLine(raw: string): Property | undefined {
  // NAME;PARAM=VALUE;PARAM="QUOTED:VALUE":value
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ":" && !inQuotes) {
      const [name, ...params] = raw.slice(0, i).split(";");
      return {
        name: name!.toUpperCase(),
        params: Object.fromEntries(
          params.map((param) => {
            const [key, value = ""] = param.split("=");
            return [key!.toUpperCase(), value.replace(/^"|"$/g, "")];
          }),
        ),
        value: raw.slice(i + 1),
        raw,
      };
    }
  }
  return undefined;
}

export function parseIcs(text: string): IcsCalendar {
  // Long lines are folded: a line break followed by a space or tab continues the line.
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const calendar: IcsCalendar = { events: [] };
  const stack: string[] = [];
  let current: IcsEvent | undefined;

  for (const line of lines) {
    const property = parseLine(line);
    if (!property) continue;
    if (property.name === "BEGIN") {
      stack.push(property.value.toUpperCase());
      if (stack.join("/") === "VCALENDAR/VEVENT")
        current = { properties: new Map(), recurring: false };
    } else if (property.name === "END") {
      if (stack.join("/") === "VCALENDAR/VEVENT" && current) calendar.events.push(current);
      if (stack.at(-1) === "VEVENT") current = undefined;
      stack.pop();
    } else if (stack.join("/") === "VCALENDAR/VEVENT" && current) {
      // Only the event's own properties; alarms inside it have their own DESCRIPTION.
      if (["RRULE", "RDATE", "RECURRENCE-ID"].includes(property.name)) current.recurring = true;
      if (!current.properties.has(property.name)) current.properties.set(property.name, property);
    } else if (stack.join("/") === "VCALENDAR" && property.name === "X-WR-TIMEZONE") {
      calendar.timezone = property.value;
    }
  }
  return calendar;
}

export function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === "n" || char === "N" ? "\n" : char,
  );
}

/** The local date of a DTSTART/DTEND, and whether it is a whole-day date. */
export function icsDate(
  property: Property,
  timezone: string,
): { date: string; allDay: boolean } | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    property.value.trim(),
  );
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second, utc] = match;
  const date = `${year}-${month}-${day}`;
  if (!hour) return { date, allDay: true };
  if (!utc) return { date, allDay: false }; // TZID or floating time: already local
  const instant = new Date(Date.UTC(+year!, +month! - 1, +day!, +hour, +minute!, +second!));
  return { date: localDate(instant, timezone), allDay: false };
}

function firstLink(html: string): string | undefined {
  for (const [url] of html.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
    // Skip links to Google Drive, Sites and Meet: they point at files, not the event page.
    if (isUrl(url) && !/(^|\.)google\.com$/.test(new URL(url).hostname)) return url;
  }
  return undefined;
}

export function readIcs(text: string, context: ReadContext): ReadResult {
  const calendar = parseIcs(text);
  const timezone = calendar.timezone ?? context.timezone;
  const result: ReadResult = { sightings: [], skipped: [] };

  for (const event of calendar.events) {
    const get = (name: string) => event.properties.get(name);
    const title = unescapeText(get("SUMMARY")?.value ?? "").trim();
    if (event.recurring) {
      result.skipped.push({ reason: "recurring", text: title });
      continue;
    }
    const kind = classify(title);
    if (!kind.event) {
      result.skipped.push({ reason: kind.reason, text: title });
      continue;
    }

    const startProperty = get("DTSTART");
    const start = startProperty && icsDate(startProperty, timezone);
    if (!startProperty || !start) {
      result.skipped.push({ reason: "invalid", text: title });
      continue;
    }
    const endProperty = get("DTEND");
    const end = endProperty && icsDate(endProperty, timezone);
    // A whole-day DTEND is the day after the last day.
    const endDate = endAfter(start.date, end && (end.allDay ? addDays(end.date, -1) : end.date));

    const location = get("LOCATION");
    const urlProperty = get("URL");
    const description = get("DESCRIPTION");
    const link = isUrl(urlProperty?.value)
      ? urlProperty!.value
      : description && firstLink(unescapeText(description.value));
    const cancelled = kind.cancelled || get("STATUS")?.value.toUpperCase() === "CANCELLED";

    const fields: SightingFields = {
      name: kind.name,
      kind: kind.kind,
      ...(context.discipline && { discipline: context.discipline }),
      startDate: start.date,
      ...(endDate && { endDate }),
      timezone,
      ...(location && { placeText: unescapeText(location.value).trim() }),
      ...(link && { url: link }),
      ...(cancelled && { cancelled: true }),
    };
    const evidence: Sighting["evidence"] = {
      name: get("SUMMARY")!.raw,
      startDate: startProperty.raw,
      ...(endDate && { endDate: endProperty!.raw }),
      ...(location && { placeText: location.raw }),
      ...(link && { url: link }),
      ...(cancelled && {
        cancelled: kind.cancelled ? get("SUMMARY")!.raw : get("STATUS")!.raw,
      }),
    };

    const uid = get("UID")?.value ?? `${start.date}:${title}`;
    const parsed = sightingSchema.safeParse({ externalId: uid, fields, evidence });
    if (parsed.success) result.sightings.push(parsed.data);
    else result.skipped.push({ reason: "invalid", text: title });
  }
  return result;
}
