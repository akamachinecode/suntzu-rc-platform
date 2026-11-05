import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readTheEventsCalendar } from "./the-events-calendar.js";

// imperial-rc-events.json: Imperial R/C Club's REST API (/wp-json/tribe/events/v1/events,
// 2026 events, read 2026-10-27), trimmed to five events. Descriptions and organisers removed:
// they named the contest directors with their emails.
const imperial = readFileSync(
  new URL("./fixtures/imperial-rc-events.json", import.meta.url),
  "utf8",
);
const url = "https://imperialrcclub.com/wp-json/tribe/events/v1/events";
const context = { discipline: "air" as const, timezone: "America/New_York" };

describe("readTheEventsCalendar on Imperial R/C Club", () => {
  const result = readTheEventsCalendar(imperial, url, context);

  it("keeps the events and drops the monthly meeting", () => {
    expect(result.sightings.map((s) => s.fields.name)).toEqual([
      "8th Annual Florida eJets",
      "SAE Aero Design East",
      "Frank Tiano Scale Fly-In",
      "Fall, All Scale, Any Size Fly-In",
    ]);
    expect(result.skipped).toEqual([
      { reason: "club-business", text: "IRCC February Monthly Meeting" },
    ]);
    expect(result.next).toBeUndefined();
  });

  it("reads the Florida eJets with local dates, venue and the quote behind each field", () => {
    expect(result.sightings[0]).toEqual({
      externalId: "imperialrcclub.com?id=14910",
      fields: {
        name: "8th Annual Florida eJets",
        discipline: "air",
        startDate: "2026-02-05",
        endDate: "2026-02-08",
        timezone: "America/New_York",
        placeText: "Imperial Radio Control Club, 4286 FL-60, Mulberry, FL",
        url: "https://imperialrcclub.com/event/2026-florida-ejets/",
      },
      evidence: {
        name: '"title":"8th Annual Florida eJets"',
        startDate: '"start_date":"2026-02-05 08:00:00"',
        endDate: '"end_date":"2026-02-08 17:00:00"',
        placeText:
          '"venue":{"venue":"Imperial Radio Control Club","address":"4286 FL-60","city":"Mulberry","state":"FL"}',
        url: '"url":"https://imperialrcclub.com/event/2026-florida-ejets/"',
      },
    });
  });

  it("takes the kind from the title when it has one", () => {
    expect(result.sightings[2]!.fields).toMatchObject({
      kind: "fly-in",
      startDate: "2026-05-07",
      endDate: "2026-05-10",
    });
  });

  it("reads events held somewhere else than the club's field", () => {
    expect(result.sightings[1]!.fields.placeText).toBe(
      "Paradise Field, 4999 Air Show Road, Lakeland, FL",
    );
  });
});

describe("readTheEventsCalendar edge cases", () => {
  const page = (events: unknown[], extra: object = {}) => JSON.stringify({ events, ...extra });
  const event = (fields: object) => ({
    title: "Swap Meet",
    start_date: "2027-01-16 08:00:00",
    end_date: "2027-01-16 13:00:00",
    url: "https://club.test/event/swap-meet/",
    categories: [],
    organizer: [{ organizer: "Someone", email: "someone@example.test" }],
    description: "<p>Call Someone at 555-0100</p>",
    ...fields,
  });

  it("never keeps organisers or descriptions", () => {
    const [swap] = readTheEventsCalendar(page([event({})]), url, context).sightings;
    expect(swap!.fields).toMatchObject({ name: "Swap Meet", kind: "swap-meet" });
    expect(JSON.stringify(swap)).not.toMatch(/Someone|555-0100/);
  });

  it("reads cancellations, fees and HTML entities in titles", () => {
    const [race] = readTheEventsCalendar(
      page([event({ title: "Winter Race &#8211; CANCELLED", cost: "$25" })]),
      url,
      context,
    ).sightings;
    expect(race!.fields).toMatchObject({
      name: "Winter Race",
      kind: "race",
      cancelled: true,
      entryFee: "$25",
    });
  });

  it("uses the club's category when the title gives no kind", () => {
    const result = readTheEventsCalendar(
      page([
        event({ title: "Blue Max", categories: [{ name: "Fly-In" }] }),
        event({ title: "Ladies' Day", categories: [{ name: "Social" }] }),
      ]),
      url,
      context,
    );
    expect(result.sightings.map((s) => [s.fields.name, s.fields.kind])).toEqual([
      ["Blue Max", "fly-in"],
    ]);
    expect(result.sightings[0]!.evidence.kind).toBe('"categories":["Fly-In"]');
    expect(result.skipped).toEqual([{ reason: "unrecognised", text: "Ladies' Day" }]);
  });

  it("returns the next page when there is one", () => {
    const next = "https://club.test/wp-json/tribe/events/v1/events?page=2";
    expect(readTheEventsCalendar(page([], { next_rest_url: next }), url, context).next).toBe(next);
  });

  it("reports a response that isn't the events API", () => {
    expect(readTheEventsCalendar("<html>", url, context).skipped).toEqual([
      { reason: "invalid", text: `${url}: not JSON` },
    ]);
  });
});
