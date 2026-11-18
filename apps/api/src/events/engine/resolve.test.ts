import { readFileSync } from "node:fs";
import type { Event } from "@workspace/db/schema";
import type { SightingFields } from "@workspace/shared";
import { describe, expect, it } from "vitest";
import { readJsonLd } from "./json-ld.js";
import { proposePatch } from "./resolve.js";

// engine.resolve (docs/bits/engine.resolve.md): what a source's latest sighting would change in
// the event it describes. resolve() applies the patch when the source speaks for the organiser
// (or is the only source) and queues it for the crew otherwise; these tests read the organiser's
// own pages (the AMPS site, saved in fixtures/, 2026-10-22) and check the patch itself.

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const context = { discipline: "air" as const, timezone: "America/New_York" };

/** What the AMPS page of an event says, as the engine reads it. */
function ampsSays(page: string, slug: string): SightingFields {
  const url = `https://www.amps-rc.com/event-details-registration/${slug}`;
  const [sighting] = readJsonLd(fixture(page), url, context).sightings;
  return sighting!.fields;
}

/** An event row as resolve finds it in the database. */
function event(overrides: Partial<Event>): Event {
  const now = new Date("2026-10-20T12:00:00Z");
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "jets-over-miami-2026",
    name: "Jets Over Miami",
    kind: "fly-in",
    discipline: "air",
    status: "confirmed",
    startDate: "2026-12-02",
    endDate: "2026-12-05",
    datePrecision: "day",
    dateText: null,
    timezone: "America/New_York",
    region: "south-florida",
    seriesId: null,
    placeId: null,
    placeText: null,
    hostId: null,
    summary: "South Florida's big jet weekend.",
    url: "https://www.modelaircraft.org/events/2026-jets-over-miami",
    sanctions: [],
    classes: [],
    entryFee: null,
    entryUrl: null,
    resultsUrl: null,
    requirements: [],
    beginnerFriendly: false,
    confidence: 0.6,
    publishedAt: now,
    rejectedAt: null,
    lastCheckedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("proposePatch on what the organiser's page says", () => {
  const jom = ampsSays("amps-jom-2026.html", "jom-2026");
  const aerofest = ampsSays("amps-aerofest.html", "aerofest-2");

  it("changes nothing when the page agrees with the event", () => {
    // "JOM 2026", Dec 2–5: the hand-checked Jets Over Miami, already confirmed.
    expect(proposePatch(event({}), jom, true)).toEqual({});
  });

  it("moves the dates when the organiser moves them", () => {
    const patch = proposePatch(
      event({ startDate: "2026-12-09", endDate: "2026-12-12" }),
      jom,
      true,
    );
    expect(patch).toEqual({ startDate: "2026-12-02", endDate: "2026-12-05" });
  });

  it("turns an expected edition ('Usually December') into dated, confirmed news", () => {
    const expected = event({
      status: "expected",
      startDate: "2026-12-01",
      endDate: null,
      datePrecision: "month",
      dateText: "Usually December",
    });
    expect(proposePatch(expected, jom, true)).toEqual({
      startDate: "2026-12-02",
      endDate: "2026-12-05",
      datePrecision: "day",
      dateText: null,
      status: "confirmed",
    });
    // A source that doesn't speak for the organiser only announces it.
    expect(proposePatch(expected, jom, false).status).toBe("announced");
  });

  it("confirms an announced event only when the organiser says it", () => {
    expect(proposePatch(event({ status: "announced" }), jom, true)).toEqual({
      status: "confirmed",
    });
    expect(proposePatch(event({ status: "announced" }), jom, false)).toEqual({});
  });

  it("cancels it when the page says so, and only the organiser puts it back on", () => {
    expect(proposePatch(event({}), { ...jom, cancelled: true }, false)).toEqual({
      status: "cancelled",
    });
    expect(proposePatch(event({ status: "cancelled" }), jom, true)).toEqual({
      status: "confirmed",
    });
    expect(proposePatch(event({ status: "cancelled" }), jom, false)).toEqual({});
  });

  it("takes a new fee and fills only what the event is missing", () => {
    // AeroFest's page: landing fee $40, its own link and summary.
    const known = event({
      name: "Aerofest",
      slug: "aerofest-2026",
      startDate: "2026-11-05",
      endDate: "2026-11-07",
      entryFee: "Landing fee $30",
    });
    expect(proposePatch(known, aerofest, true)).toEqual({ entryFee: "Landing fee $40" });
    expect(proposePatch({ ...known, url: null, summary: "" }, aerofest, true)).toEqual({
      entryFee: "Landing fee $40",
      url: aerofest.url,
      summary: aerofest.summary,
    });
  });

  it("never touches an event that has been held", () => {
    const held = event({ status: "held", startDate: "2025-12-03", endDate: "2025-12-06" });
    expect(proposePatch(held, { ...jom, cancelled: true }, true)).toEqual({});
  });
});
