import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findEvents, findLinks, readJsonLd } from "./json-ld.js";

// Trimmed copies of the AMPS site (2026-10-22): its home page links, and the schema.org data of
// two event pages exactly as published.
const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const context = { discipline: "air" as const, timezone: "America/New_York" };
const aerofestUrl = "https://www.amps-rc.com/event-details-registration/aerofest-2";

describe("readJsonLd on the AMPS event pages", () => {
  it("reads AeroFest, the event missing from the hand-typed calendar", () => {
    const result = readJsonLd(fixture("amps-aerofest.html"), aerofestUrl, context);
    expect(result.skipped).toEqual([]);
    expect(result.sightings).toEqual([
      {
        externalId: aerofestUrl,
        fields: {
          name: "Aerofest",
          kind: "fly-in",
          discipline: "air",
          startDate: "2026-11-05",
          endDate: "2026-11-07",
          timezone: "America/New_York",
          placeText: "20024 SW 168th St, Miami, FL 33187, USA",
          url: aerofestUrl,
          summary: "South Florida's Largest Gathering of Giant Scale RC Airplanes",
          entryFee: "Landing fee $40",
        },
        evidence: expect.objectContaining({
          name: '"name":"Aerofest"',
          startDate: '"startDate":"2026-11-05T07:00:00-05:00"',
          endDate: '"endDate":"2026-11-07T17:00:00-05:00"',
        }),
      },
    ]);
  });

  it("keeps events whose title gives no kind", () => {
    const url = "https://www.amps-rc.com/event-details-registration/jom-2026";
    const [jom] = readJsonLd(fixture("amps-jom-2026.html"), url, context).sightings;
    expect(jom!.fields).toMatchObject({
      name: "JOM 2026",
      startDate: "2026-12-02",
      endDate: "2026-12-05",
    });
    expect(jom!.fields.kind).toBeUndefined();
  });
});

describe("readJsonLd edge cases", () => {
  const page = (data: unknown) =>
    `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

  it("finds events inside @graph and arrays, and reads cancellations", () => {
    const html = page({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "Some Club" },
        {
          "@type": "SportsEvent",
          name: "Spring Race - Off Road",
          startDate: "2027-03-14",
          eventStatus: "https://schema.org/EventCancelled",
          location: { "@type": "Place", name: "Track", address: { addressLocality: "Davie" } },
          organizer: { "@type": "Organization", name: "Some Club" },
        },
      ],
    });
    const [race] = readJsonLd(html, "https://club.test/events", context).sightings;
    expect(race!.fields).toMatchObject({
      kind: "race",
      startDate: "2027-03-14",
      cancelled: true,
      placeText: "Track, Davie",
      hostText: "Some Club",
    });
  });

  it("turns UTC times into the local date", () => {
    const html = page({ "@type": "Event", name: "Night Fly", startDate: "2026-11-06T02:00:00Z" });
    const [event] = readJsonLd(html, "https://club.test/night", context).sightings;
    expect(event!.fields.startDate).toBe("2026-11-05");
  });

  it("skips broken blocks and events without a date", () => {
    const html = `<script type="application/ld+json">{ not json</script>${page({ "@type": "Event", name: "Someday" })}`;
    expect(readJsonLd(html, "https://club.test/x", context)).toEqual({
      sightings: [],
      skipped: [{ reason: "invalid", text: "Someday" }],
    });
  });

  it("ignores pages without events", () => {
    expect(findEvents({ "@type": "WebSite", name: "AMPS" })).toEqual([]);
  });
});

describe("findLinks", () => {
  it("returns the event pages on the same site", () => {
    expect(
      findLinks(fixture("amps-home.html"), "https://www.amps-rc.com/", /^\/event-details/),
    ).toEqual([
      "https://www.amps-rc.com/event-details-registration/aerofest-2",
      "https://www.amps-rc.com/event-details-registration/jom-2026",
    ]);
  });
});
