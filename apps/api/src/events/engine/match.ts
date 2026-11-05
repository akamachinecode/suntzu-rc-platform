import type { Region, SourceTrust } from "@workspace/shared";
import { addDays } from "./read.js";

// Resolve's judgement, kept free of the database so it can be tested on its own: how alike two
// event names are, how close two date ranges are, and whether a sighting is the same event.

const STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "at",
  "annual",
  "edition",
  "event",
  "events",
  "presents",
]);

function words(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b\d+(st|nd|rd|th)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** The words that identify an event, without years, ordinals and filler, singular. */
export function nameTokens(name: string): string[] {
  return words(name)
    .filter((word) => !STOPWORDS.has(word))
    .map((word) =>
      word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word,
    );
}

/** The name as people would write it without the year: "JOM 2026" → "JOM". */
export function tidyName(name: string): string {
  const tidy = name
    .replace(/\s*[-–—(]?\s*\b(19|20)\d{2}\b\s*\)?\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return tidy || name.trim();
}

/**
 * 0–1: how likely two names are the same event. Exact token sets score 1, an acronym of the other
 * name ("JOM" for "Jets Over Miami") scores 1, one name inside the other 0.9, otherwise the share
 * of words they have in common.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  if (isAcronymOf(ta, words(b)) || isAcronymOf(tb, words(a))) return 1;
  const shared = [...sa].filter((word) => sb.has(word)).length;
  if (shared === sa.size && shared === sb.size) return 1;
  if (shared === Math.min(sa.size, sb.size) && shared >= 1) {
    // "Aerofest" inside "AMPS Aerofest": the same event, named with or without its club.
    return 0.9;
  }
  return shared / new Set([...sa, ...sb]).size;
}

function isAcronymOf(short: string[], long: string[]): boolean {
  if (long.length < 2) return false;
  const initials = long.map((word) => word[0]).join("");
  return short.some((word) => word.length >= 2 && word.length <= 6 && word === initials);
}

export interface DateRange {
  start: string;
  end: string | null;
  /** "month": `start` is the first of the month and the real date isn't announced. */
  precision: "day" | "month";
}

function lastDay(range: DateRange): string {
  if (range.precision === "month") return addDays(addMonths(range.start, 1), -1);
  return range.end && range.end > range.start ? range.end : range.start;
}

function addMonths(date: string, months: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCMonth(day.getUTCMonth() + months);
  return day.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/**
 * 0–1: how well a sighting's dates fit an event's. 1 when they're the same days, 0.8 when they
 * overlap or fall in the month an expected event usually happens, 0.5 within three days, else 0.
 */
export function dateCloseness(sighting: DateRange, event: DateRange): number {
  const s1 = sighting.start;
  const e1 = lastDay(sighting);
  const s2 = event.start;
  const e2 = lastDay(event);
  if (event.precision === "day" && s1 === s2 && e1 === e2) return 1;
  if (s1 <= e2 && s2 <= e1) return 0.8;
  const gap = s1 > e2 ? daysBetween(e2, s1) : daysBetween(e1, s2);
  return gap <= 3 ? 0.5 : 0;
}

export interface MatchInput {
  name: string;
  dates: DateRange;
  hostId: string | null;
  placeId: string | null;
}

export interface MatchCandidate extends MatchInput {
  /** Other names we know this event by: its series' name, the host's aliases. */
  aliases: string[];
}

export type MatchVerdict =
  { kind: "same"; score: number } | { kind: "maybe"; score: number } | null;

/**
 * Same event when the dates fit and either the names agree, or the same host runs it and the
 * names share something (or the dates are exactly the same). "maybe" goes to the crew as a
 * possible merge. A date that doesn't fit is never the same event, whatever the name: that's how
 * next year's edition stays separate.
 */
export function judge(sighting: MatchInput, event: MatchCandidate): MatchVerdict {
  const date = dateCloseness(sighting.dates, event.dates);
  if (date === 0) return null;
  const name = Math.max(
    nameSimilarity(sighting.name, event.name),
    ...event.aliases.map((alias) => nameSimilarity(sighting.name, alias)),
  );
  const sameHost = sighting.hostId !== null && sighting.hostId === event.hostId;
  const samePlace = sighting.placeId !== null && sighting.placeId === event.placeId;
  // Two different clubs (or fields) can run a "Fun Fly" on the same weekend: never merge those
  // on the name alone.
  const otherHost = sighting.hostId !== null && event.hostId !== null && !sameHost;
  const otherPlace = sighting.placeId !== null && event.placeId !== null && !samePlace;
  const score = 0.4 * name + 0.3 * date + 0.2 * (sameHost ? 1 : 0) + 0.1 * (samePlace ? 1 : 0);
  if (otherHost || otherPlace) return name >= 0.6 ? { kind: "maybe", score } : null;
  if (name >= 0.6 || (sameHost && (name >= 0.25 || date === 1))) return { kind: "same", score };
  if (name >= 0.3 || (samePlace && date === 1)) return { kind: "maybe", score };
  return null;
}

const TRUST_WEIGHT: Record<SourceTrust, number> = {
  organiser: 0.9,
  "sanctioning-body": 0.85,
  aggregator: 0.6,
  community: 0.4,
};

/** How sure we are, from the sources that agree: each independent source adds its weight. */
export function confidenceOf(trusts: SourceTrust[]): number {
  const doubt = trusts.reduce((rest, trust) => rest * (1 - TRUST_WEIGHT[trust]), 1);
  return Math.min(0.99, Math.round((1 - doubt) * 100) / 100);
}

const SOUTH_FLORIDA = new Set(["Miami-Dade", "Broward", "Palm Beach", "Monroe"]);
const STATE_CODE = /,\s*([A-Z]{2})\b(?:\s+\d{5})?/;

/** Where an event belongs in the calendar's regions. */
export function regionOf(county: string | null, placeText: string | undefined): Region {
  if (county) return SOUTH_FLORIDA.has(county) ? "south-florida" : "florida";
  const state = placeText?.match(STATE_CODE)?.[1];
  if (state && state !== "FL") return "road-trip";
  return "florida";
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "event"
  );
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
