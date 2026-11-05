// Writes iCalendar feeds (RFC 5545) people subscribe to from their phone or computer. Events are
// whole-day entries in the calendar of the people subscribing, so no time zones are needed.
// A cancelled event stays in the feed as CANCELLED: that is how subscribers find out.

export interface IcsEvent {
  /** Stable for the life of the event, so calendar apps update it instead of duplicating it. */
  uid: string;
  name: string;
  startDate: string;
  endDate: string | null;
  cancelled: boolean;
  location?: string;
  latitude?: number;
  longitude?: number;
  /** The event's page on SunTzu RC. */
  url: string;
  description: string;
  updatedAt: Date;
}

export interface IcsCalendar {
  name: string;
  description: string;
  events: IcsEvent[];
}

const compactDate = (date: string) => date.replaceAll("-", "");

const utcStamp = (instant: Date) =>
  instant
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes continue on the next line after a space, never mid-character. */
export function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function writeIcs(calendar: IcsCalendar, now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SunTzu RC//RC events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    `X-WR-CALDESC:${escapeText(calendar.description)}`,
    "X-WR-TIMEZONE:America/New_York",
    // Ask calendar apps to check twice a day; most check less often anyway.
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];
  for (const event of calendar.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `LAST-MODIFIED:${utcStamp(event.updatedAt)}`,
      `DTSTART;VALUE=DATE:${compactDate(event.startDate)}`,
      // DTEND of a whole-day event is the day after the last day.
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.endDate ?? event.startDate))}`,
      `SUMMARY:${escapeText(event.cancelled ? `CANCELLED: ${event.name}` : event.name)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.latitude !== undefined && event.longitude !== undefined
        ? [`GEO:${event.latitude};${event.longitude}`]
        : []),
      `URL:${event.url}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
