import { DISCIPLINE_LABELS, KIND_LABELS } from "@/lib/events";

/**
 * How a review card reads: what the engine understood, in plain words, and the source's exact
 * words laid out to read. Pure functions, tested in format.test.ts.
 */

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));

const PRECISION: Record<string, string> = { day: "Exact days", month: "The month only" };

/** A field's value as the crew reads it: dates, kinds and disciplines as words, links by site. */
export function readValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "string") return JSON.stringify(value);
  if ((key === "startDate" || key === "endDate") && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return longDate(value);
  }
  if (key === "kind" && value in KIND_LABELS) {
    return KIND_LABELS[value as keyof typeof KIND_LABELS].label;
  }
  if (key === "discipline" && value in DISCIPLINE_LABELS) {
    return DISCIPLINE_LABELS[value as keyof typeof DISCIPLINE_LABELS];
  }
  if (key === "datePrecision") return PRECISION[value] ?? value;
  if (key === "status") return value.charAt(0).toUpperCase() + value.slice(1);
  if (key === "url") {
    try {
      const url = new URL(value);
      return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
    } catch {
      return value;
    }
  }
  return value;
}

/** `startDate` → "start date", `addressLocality` → "address locality". */
const words = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();

export type Evidence = { lines: [path: string, value: string][] } | { text: string };

/**
 * The exact words behind a field, laid out to read. Pages quote structured data as JSON
 * (`"location":{"@type":"Place","name":"Silver Field",…}`): that becomes one line per value
 * ("location › name: Silver Field"), without the schema's `@type` noise. Anything else (a
 * calendar line, a table cell, a quote from a flyer) stays exactly as written.
 */
export function readEvidence(text: string): Evidence {
  const written = text.trim();
  let parsed: unknown;
  for (const candidate of [`{${written}}`, written]) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      // not JSON in this form
    }
  }
  if (!parsed || typeof parsed !== "object") return { text: written };

  const lines: [string, string][] = [];
  const walk = (value: unknown, path: string[]) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        walk(item, value.length > 1 ? [...path, `${index + 1}`] : path),
      );
    } else if (value && typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) {
        if (!key.startsWith("@")) walk(inner, [...path, words(key)]);
      }
    } else if (value !== null && value !== undefined && value !== "") {
      lines.push([path.join(" › "), String(value)]);
    }
  };
  walk(parsed, []);
  return lines.length ? { lines } : { text: written };
}
