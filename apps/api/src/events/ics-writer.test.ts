import { describe, expect, it } from "vitest";
import { readIcs } from "./engine/ics.js";
import { escapeText, fold, writeIcs, type IcsEvent } from "./ics-writer.js";

const aerofest: IcsEvent = {
  uid: "4b8f-aerofest@servo",
  name: "AeroFest",
  startDate: "2026-11-05",
  endDate: "2026-11-07",
  cancelled: false,
  location: "Silver Field, 20044 SW 168th St, Miami, FL",
  latitude: 25.60495,
  longitude: -80.51998,
  url: "https://servo.test/events/aerofest-2026",
  description: "South Florida's largest gathering of giant scale RC airplanes.",
  updatedAt: new Date("2026-10-23T12:00:00Z"),
};
const now = new Date("2026-10-23T15:30:00Z");

describe("writeIcs", () => {
  const feed = writeIcs(
    { name: "Servo: RC events in Florida", description: "Upcoming events", events: [aerofest] },
    now,
  );

  it("writes whole-day events with an exclusive end date and CRLF lines", () => {
    expect(feed).toContain("DTSTART;VALUE=DATE:20261105\r\n");
    expect(feed).toContain("DTEND;VALUE=DATE:20261108\r\n");
    expect(feed).toContain("DTSTAMP:20261023T153000Z\r\n");
    expect(feed).toContain("GEO:25.60495;-80.51998\r\n");
    expect(feed.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
  });

  it("reads back with the engine's own ICS reader", () => {
    const { sightings } = readIcs(feed, { timezone: "America/New_York" });
    expect(sightings).toHaveLength(1);
    expect(sightings[0]!.fields).toMatchObject({
      name: "AeroFest",
      startDate: "2026-11-05",
      endDate: "2026-11-07",
      placeText: "Silver Field, 20044 SW 168th St, Miami, FL",
    });
  });

  it("keeps cancelled events, marked, so subscribers find out", () => {
    const cancelled = writeIcs(
      { name: "x", description: "x", events: [{ ...aerofest, cancelled: true }] },
      now,
    );
    expect(cancelled).toContain("SUMMARY:CANCELLED: AeroFest\r\n");
    expect(cancelled).toContain("STATUS:CANCELLED\r\n");
    const [sighting] = readIcs(cancelled, { timezone: "America/New_York" }).sightings;
    expect(sighting!.fields.cancelled).toBe(true);
  });

  it("writes one-day events ending the next day", () => {
    const oneDay = writeIcs(
      { name: "x", description: "x", events: [{ ...aerofest, endDate: null }] },
      now,
    );
    expect(oneDay).toContain("DTEND;VALUE=DATE:20261106\r\n");
  });
});

describe("text helpers", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeText("Fun fly, BBQ; swap\\meet\nall day")).toBe(
      "Fun fly\\, BBQ\\; swap\\\\meet\\nall day",
    );
  });

  it("folds long lines at 75 bytes without splitting a character", () => {
    const line = `DESCRIPTION:${"Vuelo ✈️ ".repeat(20)}`;
    const folded = fold(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded)
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(line);
  });
});
