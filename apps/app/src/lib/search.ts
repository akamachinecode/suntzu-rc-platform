import { createApiClient } from "@workspace/api-client";
import { type SearchResponse, type SearchResult, type SearchType } from "@workspace/shared";
import { CalendarDays, LocateFixed, type LucideIcon, Send, ShieldQuestionMark } from "lucide-react";
import { formatWhen } from "@/lib/events";

// How search reads on the site (docs/specs/0005-search.md). Shared by the results page and the
// search box, so this file runs in the browser too: nothing server-only here.

/** The results page's tabs and the groups of results, in the box and on the page. */
export const SEARCH_GROUPS = [
  { key: "events", label: "Events", types: ["event"] },
  { key: "places", label: "Places", types: ["place"] },
  { key: "clubs", label: "Clubs", types: ["club"] },
  { key: "learn", label: "Guides and rules", types: ["guide", "rule", "service"] },
] as const satisfies readonly { key: string; label: string; types: readonly SearchType[] }[];

export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export const TYPE_LABELS: Record<SearchType, string> = {
  event: "Event",
  place: "Place",
  club: "Club",
  guide: "Guide",
  rule: "Rule",
  service: "With Servo",
};

/** Where to go when a search finds nothing, and when the box opens empty. */
export const SEARCH_SHORTCUTS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "This weekend", href: "/events?when=weekend", icon: CalendarDays },
  { label: "Near me", href: "/places?near=me", icon: LocateFixed },
  { label: "Can I fly here?", href: "/places/can-i-fly-here", icon: ShieldQuestionMark },
  { label: "Send us your event", href: "/submit", icon: Send },
];

const inGroup = (group: SearchGroup, result: SearchResult) =>
  (group.types as readonly SearchType[]).includes(result.type);

/** Results in their groups, the group that holds the best result first. */
export function groupResults(results: SearchResult[]) {
  return SEARCH_GROUPS.map((group) => ({
    ...group,
    results: results.filter((result) => inGroup(group, result)),
    best: results.findIndex((result) => inGroup(group, result)),
  }))
    .filter((group) => group.results.length)
    .sort((a, b) => a.best - b.best);
}

/**
 * "Nov 14–16, 2026". Search knows an event's first and last day only; one known by month runs
 * from the 1st to the last day of it, so that reads as "November 2026".
 */
export function formatResultDates(result: Pick<SearchResult, "startsOn" | "endsOn">) {
  if (!result.startsOn) return null;
  const { startsOn, endsOn } = result;
  const lastOfMonth = endsOn && new Date(`${endsOn}T12:00:00Z`).getUTCDate() >= 28;
  const wholeMonth =
    startsOn.endsWith("-01") && lastOfMonth && endsOn.slice(0, 7) === startsOn.slice(0, 7);
  return formatWhen({
    startDate: startsOn,
    endDate: endsOn,
    datePrecision: wholeMonth ? "month" : "day",
    dateText: null,
  });
}

export const searchUrl = (q: string) => `/search?q=${encodeURIComponent(q.trim())}`;

/** The API from the browser, for search as you type. Public data only: it sends no cookies. */
export const browserApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

const reported = new Set<string>();

/**
 * Tells the crew, anonymously, that a search found nothing or only partial matches: the words
 * only. Once per search per visit; the API searches again and counts it only if it still does.
 */
export function reportMiss(response: Pick<SearchResponse, "q" | "results" | "partial">) {
  const q = response.q;
  const words = q.trim().toLowerCase();
  const little = !response.results.length || response.partial;
  if (words.length < 3 || !little || reported.has(words)) return;
  reported.add(words);
  void browserApi.POST("/search/misses", { body: { q: q.trim() } }).catch(() => undefined);
}

// The last few searches, kept on this device only (never sent anywhere).
const RECENT_KEY = "servo.recent-searches";
const RECENT_MAX = 5;

export function readRecent(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter((item): item is string => typeof item === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function saveRecent(q: string) {
  const words = q.trim();
  if (!words) return;
  try {
    const list = [
      words,
      ...readRecent().filter((item) => item.toLowerCase() !== words.toLowerCase()),
    ];
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // Private windows and blocked storage: recent searches just aren't kept.
  }
}
