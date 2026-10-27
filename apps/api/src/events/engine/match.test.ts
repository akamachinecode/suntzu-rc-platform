import { describe, expect, it } from "vitest";
import {
  confidenceOf,
  dateCloseness,
  judge,
  nameSimilarity,
  regionOf,
  slugify,
  tidyName,
  type MatchCandidate,
} from "./match.js";

const day = (start: string, end: string | null = null) => ({
  start,
  end,
  precision: "day" as const,
});

const jetsOverMiami: MatchCandidate = {
  name: "Jets Over Miami",
  dates: day("2026-12-02", "2026-12-05"),
  hostId: "amps",
  placeId: "silver-field",
  aliases: [],
};

describe("nameSimilarity", () => {
  it("reads an acronym as the full name", () => {
    expect(nameSimilarity("JOM 2026", "Jets Over Miami")).toBe(1);
  });

  it("ignores years, ordinals and filler words", () => {
    expect(nameSimilarity("The 21st Annual Aerofest 2026", "Aerofest")).toBe(1);
  });

  it("matches a name inside a longer one", () => {
    expect(nameSimilarity("AMPS Aerofest", "Aerofest")).toBe(0.9);
  });

  it("keeps different events apart", () => {
    expect(nameSimilarity("Aerofest", "Jets Over DeLand")).toBe(0);
  });
});

describe("dateCloseness", () => {
  it("is exact for the same days", () => {
    expect(dateCloseness(day("2026-12-02", "2026-12-05"), day("2026-12-02", "2026-12-05"))).toBe(1);
  });

  it("fits an expected event's month", () => {
    expect(
      dateCloseness(day("2027-02-12", "2027-02-14"), {
        start: "2027-02-01",
        end: null,
        precision: "month",
      }),
    ).toBe(0.8);
  });

  it("tolerates a few days' difference, not more", () => {
    expect(dateCloseness(day("2026-12-08"), day("2026-12-02", "2026-12-05"))).toBe(0.5);
    expect(dateCloseness(day("2026-12-20"), day("2026-12-02", "2026-12-05"))).toBe(0);
  });
});

describe("judge", () => {
  it("links the organiser's own listing to the event", () => {
    const verdict = judge(
      {
        name: "JOM 2026",
        dates: day("2026-12-02", "2026-12-05"),
        hostId: "amps",
        placeId: "silver-field",
      },
      jetsOverMiami,
    );
    expect(verdict?.kind).toBe("same");
  });

  it("never links next year's edition, whatever the name", () => {
    expect(
      judge(
        { name: "Jets Over Miami", dates: day("2027-12-01"), hostId: "amps", placeId: null },
        jetsOverMiami,
      ),
    ).toBeNull();
  });

  it("keeps two events on the same weekend apart", () => {
    expect(
      judge(
        { name: "Aerofest", dates: day("2026-11-05", "2026-11-07"), hostId: "amps", placeId: null },
        {
          name: "Jets Over DeLand",
          dates: day("2026-11-05", "2026-11-07"),
          hostId: "deland",
          placeId: null,
          aliases: [],
        },
      ),
    ).toBeNull();
  });

  it("matches through an alias such as the series name", () => {
    const verdict = judge(
      {
        name: "Snowbird Nats",
        dates: day("2027-01-22", "2027-01-24"),
        hostId: null,
        placeId: null,
      },
      {
        name: "Snowbird Nationals",
        dates: { start: "2027-01-01", end: null, precision: "month" },
        hostId: null,
        placeId: null,
        aliases: ["Snowbird Nats"],
      },
    );
    expect(verdict?.kind).toBe("same");
  });

  it("asks the crew when it isn't sure", () => {
    const verdict = judge(
      { name: "Miami Jet Rally", dates: day("2026-12-02"), hostId: null, placeId: null },
      jetsOverMiami,
    );
    expect(verdict?.kind).toBe("maybe");
  });
});

describe("helpers", () => {
  it("adds up independent sources", () => {
    expect(confidenceOf(["organiser"])).toBe(0.9);
    expect(confidenceOf(["organiser", "aggregator"])).toBe(0.96);
  });

  it("puts events in their region", () => {
    expect(regionOf("Broward", undefined)).toBe("south-florida");
    expect(regionOf("Volusia", undefined)).toBe("florida");
    expect(regionOf(null, "Perry, GA 31069")).toBe("road-trip");
    expect(regionOf(null, "20024 SW 168th St, Miami, FL 33187, USA")).toBe("florida");
  });

  it("tidies names and slugs", () => {
    expect(tidyName("JOM 2026")).toBe("JOM");
    expect(tidyName("Aerofest (2026)")).toBe("Aerofest");
    expect(slugify("Jets Over Miami 2026!")).toBe("jets-over-miami-2026");
  });
});
