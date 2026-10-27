import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readWildApricot } from "./wild-apricot.js";

// rcacf-events.rss: the events feed of the Remote Control Association of Central Florida
// (Wild Apricot, read 2026-10-27), trimmed to three items; the work party's note removed.
const rcacf = readFileSync(new URL("./fixtures/rcacf-events.rss", import.meta.url), "utf8");
const feedUrl = "https://rcacf.com/events/RSS";
const context = { discipline: "air" as const, timezone: "America/New_York" };

const feed = (...items: string[]) =>
  `<?xml version="1.0"?><rss version="2.0"><channel>${items.join("")}</channel></rss>`;
const item = (title: string, pubDate: string, id: string) =>
  `<item><pubDate>${pubDate}</pubDate><title>${title}</title>` +
  `<description>&lt;p&gt;Call Someone at 555-0100&lt;/p&gt;</description>` +
  `<link>https://rcacf.com/event-${id}</link><guid>https://rcacf.com/event-${id}</guid></item>`;

describe("readWildApricot on RCACF's feed", () => {
  it("drops the meeting, the work party and the date still to be announced", () => {
    expect(readWildApricot(rcacf, feedUrl, context)).toEqual({
      sightings: [],
      skipped: [
        { reason: "club-business", text: "RCACF - Monthly Membership Meeting" },
        { reason: "club-business", text: "RCACF - Monthly Work Party" },
        { reason: "practice", text: "RCACF Event - TBA" },
      ],
    });
  });
});

describe("readWildApricot", () => {
  it("reads an event's name, local date and link, and the quote behind each", () => {
    const xml = feed(
      item("RCACF - Apopka E-Jet Rally (10/3/2026)", "Sat, 03 Oct 2026 12:00:00 GMT", "6871574"),
    );
    expect(readWildApricot(xml, feedUrl, context).sightings).toEqual([
      {
        externalId: "https://rcacf.com/event-6871574",
        fields: {
          name: "RCACF - Apopka E-Jet Rally",
          kind: "fly-in",
          discipline: "air",
          startDate: "2026-10-03",
          timezone: "America/New_York",
          url: "https://rcacf.com/event-6871574",
        },
        evidence: {
          name: "<title>RCACF - Apopka E-Jet Rally (10/3/2026)</title>",
          startDate: "<title>RCACF - Apopka E-Jet Rally (10/3/2026)</title>",
          url: "<link>https://rcacf.com/event-6871574</link>",
        },
      },
    ]);
  });

  it("reads events over several days and never keeps descriptions", () => {
    const xml = feed(
      item("Tangerine Airfest (3/12/2027 - 3/14/2027)", "Fri, 12 Mar 2027 13:00:00 GMT", "1"),
    );
    const [airfest] = readWildApricot(xml, feedUrl, context).sightings;
    expect(airfest!.fields).toMatchObject({ startDate: "2027-03-12", endDate: "2027-03-14" });
    expect(JSON.stringify(airfest)).not.toMatch(/Someone|555-0100/);
  });

  it("falls back to pubDate, in the club's time zone, when the title has no date", () => {
    // 01:00 UTC on Sunday is still Saturday evening in Florida.
    const xml = feed(item("Night Fly-In", "Sun, 08 Nov 2026 01:00:00 GMT", "2"));
    const [night] = readWildApricot(xml, feedUrl, context).sightings;
    expect(night!.fields.startDate).toBe("2026-11-07");
    expect(night!.evidence.startDate).toBe("<pubDate>Sun, 08 Nov 2026 01:00:00 GMT</pubDate>");
  });

  it("reads cancellations and entities", () => {
    const xml = feed(
      item("Swap Meet &amp; Auction - CANCELLED (1/9/2027)", "Sat, 09 Jan 2027 14:00:00 GMT", "3"),
    );
    expect(readWildApricot(xml, feedUrl, context).sightings[0]!.fields).toMatchObject({
      name: "Swap Meet & Auction",
      kind: "swap-meet",
      cancelled: true,
    });
  });

  it("reports a response that isn't a feed", () => {
    expect(readWildApricot("<html></html>", feedUrl, context).skipped).toEqual([
      { reason: "invalid", text: `${feedUrl}: not an RSS feed` },
    ]);
  });
});
