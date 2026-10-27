import { describe, expect, it } from "vitest";
import { type Extraction, verify } from "./ai.js";

const FLYER = `PALM BEACH RC presents the WINTER FUN FLY!
Saturday January 16th & Sunday January 17th
West Delray Regional Park flying field, 10875 W Atlantic Ave
Landing fee $20 · All pilots must have AMA.
Info: https://example.org/funfly`;

const base: Extraction["events"][number] = {
  name: "Winter Fun Fly",
  startDate: "2027-01-16",
  endDate: "2027-01-17",
  placeText: "West Delray Regional Park flying field",
  entryFee: "Landing fee $20",
  url: "https://example.org/funfly",
  kind: "fly-in",
  discipline: "air",
  quotes: {
    name: "WINTER FUN FLY",
    startDate: "Saturday January 16th",
    endDate: "Sunday January 17th",
    placeText: "West Delray Regional Park flying field",
    entryFee: "Landing fee $20",
    url: "https://example.org/funfly",
  },
};

describe("verify", () => {
  it("keeps every field the text really says, with its quote", () => {
    const [sighting] = verify({ events: [base] }, FLYER, "sub-1");
    expect(sighting?.fields).toMatchObject({
      name: "Winter Fun Fly",
      startDate: "2027-01-16",
      endDate: "2027-01-17",
      placeText: "West Delray Regional Park flying field",
      entryFee: "Landing fee $20",
      url: "https://example.org/funfly",
      kind: "fly-in",
    });
    expect(sighting?.evidence.entryFee).toBe("Landing fee $20");
    expect(sighting?.externalId).toBe("sub-1#0");
  });

  it("drops a field whose quote isn't in the text", () => {
    const [sighting] = verify(
      {
        events: [
          { ...base, entryFee: "$40", quotes: { ...base.quotes, entryFee: "Landing fee $40" } },
        ],
      },
      FLYER,
      "sub-1",
    );
    expect(sighting?.fields.entryFee).toBeUndefined();
    expect(sighting?.evidence.entryFee).toBeUndefined();
  });

  it("drops an event without a quoted name or date", () => {
    expect(
      verify(
        { events: [{ ...base, quotes: { ...base.quotes, name: "Spring Jamboree" } }] },
        FLYER,
        "s",
      ),
    ).toEqual([]);
    expect(verify({ events: [{ ...base, startDate: "January 16" }] }, FLYER, "s")).toEqual([]);
  });

  it("ignores case and spacing when it compares quotes", () => {
    const [sighting] = verify(
      {
        events: [
          {
            ...base,
            quotes: { ...base.quotes, placeText: "west  delray regional PARK flying field" },
          },
        ],
      },
      FLYER,
      "s",
    );
    expect(sighting?.fields.placeText).toBe("West Delray Regional Park flying field");
  });
});
