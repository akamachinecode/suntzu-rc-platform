/** "Dec 2–5, 2026" in emails, the same way the site writes dates. */
export function formatDates(start: string, end: string | null): string {
  const day = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(
      new Date(`${date}T12:00:00Z`),
    );
  if (!end || end === start) return day(start, { month: "short", day: "numeric", year: "numeric" });
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return `${day(start, { month: "short", day: "numeric", year: "numeric" })} – ${day(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (start.slice(5, 7) !== end.slice(5, 7)) {
    return `${day(start, { month: "short", day: "numeric" })} – ${day(end, { month: "short", day: "numeric" })}, ${end.slice(0, 4)}`;
  }
  return `${day(start, { month: "short", day: "numeric" })}–${day(end, { day: "numeric" })}, ${end.slice(0, 4)}`;
}
