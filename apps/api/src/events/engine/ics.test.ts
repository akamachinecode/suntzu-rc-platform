import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { icsDate, parseIcs, readIcs, unescapeText } from "./ics.js";

// deland-rc.ics: entries from DeLand RC's public Google Calendar (2026-10-22), trimmed to a
// few cases, with organisers' names and emails removed.
const delandRc = readFileSync(new URL("./fixtures/deland-rc.ics", import.meta.url), "utf8");
const context = { discipline: "air" as const, timezone: "America/New_York" };

describe("readIcs on DeLand RC's calendar", () => {
  const result = readIcs(delandRc, context);
  const byName = (name: string) => result.sightings.filter((s) => s.fields.name === name);

  it("keeps the events and drops meetings, notices and repeating entries", () => {
    expect(result.sightings.map((s) => s.fields.name).sort()).toEqual([
      "Fun Fly w/Swap meet",
      "Jets Over Deland",
      "RC Flight Training",
      "Winter Air Fest /Swap Meet",
      "Winter Airfest",
    ]);
    expect(result.skipped).toEqual([
      { reason: "club-business", text: "board meeting" },
      { reason: "notice", text: "Field closed for Car Club event" },
      { reason: "club-business", text: "Volunteers Meeting - JETS OVER DELAND" },
      { reason: "recurring", text: "BBQ Wed 5pm" },
    ]);
  });

  it("reads Jets Over Deland 2026 with local dates, place and link", () => {
    const [jets] = byName("Jets Over Deland");
    expect(jets).toEqual({
      externalId: "3i1fbpim0520isdu84tfkfkn9a@google.com",
      fields: {
        name: "Jets Over Deland",
        kind: "fly-in",
        discipline: "air",
        startDate: "2026-11-05",
        endDate: "2026-11-07",
        timezone: "America/New_York",
        url: "https://www.delandrc.com/jets-over-deland",
      },
      evidence: {
        name: "SUMMARY:Jets Over Deland",
        startDate: "DTSTART:20261105T140000Z",
        endDate: "DTEND:20261107T213000Z",
        url: "https://www.delandrc.com/jets-over-deland",
      },
    });
  });

  it("marks cancelled events and cleans the word out of the name", () => {
    const [airfest] = byName("Winter Airfest");
    expect(airfest!.fields).toMatchObject({
      startDate: "2021-02-06",
      cancelled: true,
      placeText: "DeLand Radio Control Club, 1000 RC Club Drive, DeLand, FL 32724, USA",
    });
    // A whole-day event ends the day before its DTEND.
    expect(airfest!.fields.endDate).toBeUndefined();
    expect(airfest!.evidence.cancelled).toBe("SUMMARY:Winter Airfest - CANCELLED");
  });

  it("guesses the kind from the title", () => {
    expect(byName("RC Flight Training")[0]!.fields.kind).toBe("course");
    expect(byName("Fun Fly w/Swap meet")[0]!.fields.kind).toBe("fly-in");
  });
});

describe("parseIcs", () => {
  it("unfolds long lines and ignores properties of nested alarms", () => {
    const calendar = parseIcs(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Spring Fun",
        "  Fly",
        "BEGIN:VALARM",
        "DESCRIPTION:Reminder",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
    );
    const [event] = calendar.events;
    expect(event!.properties.get("SUMMARY")!.value).toBe("Spring Fun Fly");
    expect(event!.properties.has("DESCRIPTION")).toBe(false);
  });

  it("keeps colons inside quoted parameters", () => {
    const calendar = parseIcs(
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nLOCATION;ALTREP="https://x.test/a":Field\nEND:VEVENT\nEND:VCALENDAR',
    );
    expect(calendar.events[0]!.properties.get("LOCATION")!.value).toBe("Field");
  });
});

describe("icsDate", () => {
  const date = (raw: string) =>
    icsDate(
      parseIcs(
        `BEGIN:VCALENDAR\nBEGIN:VEVENT\n${raw}\nEND:VEVENT\nEND:VCALENDAR`,
      ).events[0]!.properties.get("DTSTART")!,
      "America/New_York",
    );

  it("turns UTC instants into the local date", () => {
    // 02:00 UTC on Nov 6 is still Nov 5 in Florida.
    expect(date("DTSTART:20261106T020000Z")).toEqual({ date: "2026-11-05", allDay: false });
  });

  it("reads local and whole-day dates as written", () => {
    expect(date("DTSTART;TZID=America/New_York:20261105T090000")).toEqual({
      date: "2026-11-05",
      allDay: false,
    });
    expect(date("DTSTART;VALUE=DATE:20261105")).toEqual({ date: "2026-11-05", allDay: true });
  });
});

it("unescapes text values", () => {
  expect(unescapeText("Fun Fly\\, BBQ\\; swap\\nmeet")).toBe("Fun Fly, BBQ; swap\nmeet");
});
