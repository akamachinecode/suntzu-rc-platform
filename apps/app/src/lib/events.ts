import type { Discipline, EventKind, RcEvent, Region } from "@workspace/shared";

// How events read on the site. Shared by the list, the event page, the map and the home page.

export const KIND_LABELS: Record<EventKind, { label: string; plural: string }> = {
  "fly-in": { label: "Fly-in", plural: "Fly-ins" },
  competition: { label: "Competition", plural: "Competitions" },
  race: { label: "Race", plural: "Races" },
  show: { label: "Show", plural: "Shows" },
  "swap-meet": { label: "Swap meet", plural: "Swap meets" },
  "open-day": { label: "Open day", plural: "Open days" },
  course: { label: "Course", plural: "Courses" },
  other: { label: "Event", plural: "Other events" },
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  air: "Planes and jets",
  rotor: "Helicopters",
  ground: "Cars",
  fpv: "FPV drones",
};

/** One colour per discipline, the same as the guides (sky, yellow, red), plus green for FPV. */
export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  air: "bg-sky",
  rotor: "bg-primary",
  ground: "bg-lead",
  fpv: "bg-mat text-mat-foreground",
};

export const REGION_LABELS: Record<Region, string> = {
  "south-florida": "South Florida",
  florida: "Florida",
  "road-trip": "Road trip",
};

const day = (date: string) => new Date(`${date}T12:00:00Z`);
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(day(date));

/** "Nov 5–7, 2026", "Dec 30, 2026 – Jan 2, 2027", or the organiser's wording when not exact. */
export function formatWhen(
  event: Pick<RcEvent, "startDate" | "endDate" | "datePrecision" | "dateText">,
): string {
  if (event.datePrecision !== "day") {
    return event.dateText ?? format(event.startDate, { month: "long", year: "numeric" });
  }
  const { startDate: start, endDate: end } = event;
  if (!end || end === start)
    return format(start, { month: "short", day: "numeric", year: "numeric" });
  const [startYear, endYear] = [start.slice(0, 4), end.slice(0, 4)];
  if (startYear !== endYear) {
    return `${format(start, { month: "short", day: "numeric", year: "numeric" })} – ${format(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (start.slice(5, 7) !== end.slice(5, 7)) {
    return `${format(start, { month: "short", day: "numeric" })} – ${format(end, { month: "short", day: "numeric" })}, ${endYear}`;
  }
  return `${format(start, { month: "short", day: "numeric" })}–${format(end, { day: "numeric" })}, ${endYear}`;
}

/** Where it happens, as one line: "Silver Field, Miami" or "Orlando, FL". */
export function formatWhere(event: Pick<RcEvent, "place" | "placeText">): string {
  if (event.place) return [event.place.name, event.place.city].filter(Boolean).join(", ");
  return event.placeText ?? "Place to be announced";
}

/** Dates people can plan around: announced by the organiser, not just expected. */
export const hasExactDates = (event: Pick<RcEvent, "datePrecision">) =>
  event.datePrecision === "day";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

/** Great-circle distance in miles, for "near me". */
export function milesBetween(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a.map((deg) => (deg * Math.PI) / 180) as [number, number];
  const [lat2, lon2] = b.map((deg) => (deg * Math.PI) / 180) as [number, number];
  const h =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** Friday to Sunday of this weekend (or the coming one), as YYYY-MM-DD in Florida. */
export function weekendRange(now = new Date()): { from: string; to: string } {
  const today = new Date(`${floridaDate(now)}T12:00:00Z`);
  const weekday = today.getUTCDay(); // 0 Sunday … 6 Saturday
  const friday = new Date(today);
  friday.setUTCDate(today.getUTCDate() + (weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday));
  const sunday = new Date(friday);
  sunday.setUTCDate(friday.getUTCDate() + 2);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { from: weekday >= 5 || weekday === 0 ? iso(today) : iso(friday), to: iso(sunday) };
}

/** True when an event with exact dates runs on at least one day of the range. */
export function runsBetween(
  event: Pick<RcEvent, "startDate" | "endDate" | "datePrecision">,
  from: string,
  to: string,
) {
  if (event.datePrecision !== "day") return false;
  return event.startDate <= to && (event.endDate ?? event.startDate) >= from;
}

/** Today's date in Florida as YYYY-MM-DD, the same in every browser and on the server. */
export function floridaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
