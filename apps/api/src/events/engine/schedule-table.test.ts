import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { onlyPlaces } from "./read.js";
import { readScheduleTable, scheduleDates } from "./schedule-table.js";

// extreme-flight-schedule.html: Extreme Flight's event schedule (2026-10-27), trimmed to the
// table and to eight of its rows. No personal data on the page.
const schedule = readFileSync(
  new URL("./fixtures/extreme-flight-schedule.html", import.meta.url),
  "utf8",
);
const pageUrl = "https://extremeflightrc.com/pages/event-schedule";
const context = { discipline: "air" as const, timezone: "America/New_York" };

describe("readScheduleTable on Extreme Flight's schedule", () => {
  const result = readScheduleTable(schedule, pageUrl, context);

  it("reads every row under its year", () => {
    expect(result.skipped).toEqual([]);
    expect(result.sightings.map((s) => [s.fields.startDate, s.fields.name])).toEqual([
      ["2026-02-19", "3D Over the Glades"],
      ["2026-02-27", "Southeast Model Show"],
      ["2026-03-07", "SPARKS 4th Annual 3D Fun Fly"],
      ["2026-03-12", "Jacksonville Jet Madness"],
      ["2026-04-09", "Extreme Flight's Wings Over America"],
      ["2026-10-02", "Nall in the Fall"],
      ["2026-10-14", "Tucson Aerobatic Shootout"],
    ]);
  });

  it("reads 3D Over the Glades with its dates, town, flyer and the text behind each", () => {
    expect(result.sightings[0]).toEqual({
      externalId: `${pageUrl}#2026:3D Over the Glades`,
      fields: {
        name: "3D Over the Glades",
        discipline: "air",
        startDate: "2026-02-19",
        endDate: "2026-02-22",
        timezone: "America/New_York",
        placeText: "Delray Beach, FL",
        url: "https://www.palmbeachrc.com/_files/ugd/e50535_e964406fddea4f6297c17b6e62fbb609.pdf",
      },
      evidence: {
        name: "3D Over the Glades",
        startDate: "2026 · Feb 19 - Feb 22",
        endDate: "2026 · Feb 19 - Feb 22",
        placeText: "Delray Beach, FL",
        url: "https://www.palmbeachrc.com/_files/ugd/e50535_e964406fddea4f6297c17b6e62fbb609.pdf",
      },
    });
  });

  it("reads rows without a link, and the kind when the name gives it", () => {
    expect(result.sightings[2]!.fields).toEqual({
      name: "SPARKS 4th Annual 3D Fun Fly",
      kind: "fly-in",
      discipline: "air",
      startDate: "2026-03-07",
      timezone: "America/New_York",
      placeText: "St. Petersburg, FL",
    });
  });

  it("keeps only Florida with onlyPlaces", () => {
    const florida = onlyPlaces(result, /,\s*FL$/);
    expect(florida.sightings.map((s) => s.fields.name)).toEqual([
      "3D Over the Glades",
      "SPARKS 4th Annual 3D Fun Fly",
      "Jacksonville Jet Madness",
    ]);
    expect(florida.skipped).toContainEqual({
      reason: "elsewhere",
      text: "Southeast Model Show (Perry, GA)",
    });
  });
});

describe("scheduleDates", () => {
  it.each([
    ["Mar 7", { startDate: "2027-03-07" }],
    ["Feb 19 - Feb 22", { startDate: "2027-02-19", endDate: "2027-02-22" }],
    ["Oct 14 - 18", { startDate: "2027-10-14", endDate: "2027-10-18" }],
    ["Sept 5th – 7th", { startDate: "2027-09-05", endDate: "2027-09-07" }],
    ["Dec 30 - Jan 2", { startDate: "2027-12-30", endDate: "2028-01-02" }],
  ])("reads %s", (text, dates) => {
    expect(scheduleDates(text, 2027)).toEqual(dates);
  });

  it.each(["TBA", "Feb 30", "Spring 2027"])("refuses %s", (text) => {
    expect(scheduleDates(text, 2027)).toBeUndefined();
  });
});

describe("readScheduleTable edge cases", () => {
  it("skips rows before any year heading", () => {
    const html = "<table><tr><td>Mar 7</td><td>Fun Fly</td><td>Ocala, FL</td></tr></table>";
    expect(readScheduleTable(html, pageUrl, context)).toEqual({
      sightings: [],
      skipped: [{ reason: "invalid", text: "Mar 7 Fun Fly" }],
    });
  });
});
