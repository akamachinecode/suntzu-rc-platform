import { describe, expect, it } from "vitest";
import { dateIn, floridaDate } from "./events";

describe("dateIn", () => {
  // 2026-12-06 at 00:30 UTC: Saturday evening in Florida, still Saturday on the Panhandle.
  const evening = new Date("2026-12-06T00:30:00Z");

  it("gives the date where the event happens, not the UTC date", () => {
    expect(evening.toISOString().slice(0, 10)).toBe("2026-12-06");
    expect(dateIn("America/New_York", evening)).toBe("2026-12-05");
    expect(dateIn("America/Chicago", evening)).toBe("2026-12-05");
  });

  it("turns at midnight in each zone", () => {
    const eastMidnight = new Date("2026-12-06T05:30:00Z"); // 00:30 Eastern, 23:30 Central
    expect(dateIn("America/New_York", eastMidnight)).toBe("2026-12-06");
    expect(dateIn("America/Chicago", eastMidnight)).toBe("2026-12-05");
  });

  it("falls back to Florida for an unknown zone", () => {
    expect(dateIn("Mars/Olympus_Mons", evening)).toBe(floridaDate(evening));
  });
});
