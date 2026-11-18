import { expect, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { crewApi, type NewEvent } from "./data.ts";
import { API } from "./env.ts";
import { FROM_APP } from "./people.ts";

// Helpers for the public pages' tests (events, places, clubs, search, the widget): what a visitor
// reads, made from events the crew adds by hand (data.ts).

/**
 * One made-up word nobody else uses, to find what a test made: "Qwizbelkardo". Random letters
 * only, with nothing in common between two of them: search corrects a word it doesn't know yet
 * to a similar one it knows, so words made from a shared prefix or a clock would find each other.
 */
export function word(prefix = ""): string {
  const letters = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    String.fromCharCode(97 + (byte % 26)),
  ).join("");
  return prefix ? `${prefix}${letters}` : `${letters[0]!.toUpperCase()}${letters.slice(1)}`;
}

/** A date `days` from today in Florida (YYYY-MM-DD), the calendar the site counts days by. */
export function floridaDate(days = 0, now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A day of "this weekend" as /events counts it: today from Friday to Sunday, else Saturday. */
export function weekendDay(): string {
  const weekday = new Date(`${floridaDate()}T12:00:00Z`).getUTCDay();
  return floridaDate(weekday === 5 || weekday === 6 || weekday === 0 ? 0 : 6 - weekday);
}

/** What every new event in these tests gets unless it says otherwise (the API needs a valid kind). */
export const AN_EVENT: NewEvent = { kind: "fly-in", discipline: "air" };

/** The crew changes an event (PATCH /crew/events/{slug}): cancels it, or keeps only the month. */
export async function editEvent(
  playwright: PlaywrightWorkerArgs["playwright"],
  slug: string,
  patch: Record<string, unknown>,
) {
  const crew = await crewApi(playwright);
  const response = await crew.patch(`${API}/crew/events/${slug}`, {
    data: patch,
    headers: FROM_APP,
  });
  expect(response.status(), `PATCH /crew/events/${slug} answered ${await response.text()}`).toBe(
    204,
  );
  await crew.dispose();
}

/** The VEVENT with this UID in an iCalendar file, its folded lines joined again; or undefined. */
export function vevent(ics: string, uid: string): string | undefined {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  return unfolded
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => block.split("END:VEVENT")[0]!)
    .find((block) => block.split(/\r?\n/).includes(`UID:${uid}`));
}

/** The schema.org object of `type` in the page's JSON-LD (what search engines read). */
export async function structuredData(page: Page, type: string): Promise<Record<string, unknown>> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const found = scripts
    .map((text) => JSON.parse(text) as Record<string, unknown>)
    .find((data) => data["@type"] === type);
  expect(found, `no schema.org ${type} on ${page.url()}`).toBeTruthy();
  return found!;
}

/** Width and height of a PNG, from its header. */
export function pngSize(png: Buffer): { width: number; height: number } {
  expect(png.subarray(0, 8).toString("hex"), "not a PNG").toBe("89504e470d0a1a0a");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
