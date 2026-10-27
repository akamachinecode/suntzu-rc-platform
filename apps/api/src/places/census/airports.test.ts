import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readAirport } from "./airports.js";
import type { RawFeature } from "./arcgis.js";

// airports.json: five Florida records of the FAA's US_Airport layer (read 2026-10-27).
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/airports.json", import.meta.url), "utf8"),
) as { features: RawFeature[] };
const outcomes = fixture.features.map(readAirport);
const airport = (ident: string) =>
  outcomes.flatMap((outcome) => (outcome.ok ? [outcome.value] : [])).find((a) => a.ident === ident);

describe("readAirport", () => {
  it("reads a public airport", () => {
    expect(airport("MIA")).toEqual({
      ident: "MIA",
      name: "Miami Intl",
      kind: "airport",
      city: "Miami",
      state: "FL",
      latitude: expect.closeTo(25.795, 2),
      longitude: expect.closeTo(-80.29, 2),
      publicUse: true,
    });
  });

  it("reads heliports and seaplane bases, public or private", () => {
    expect(airport("01FD")).toMatchObject({ kind: "heliport", publicUse: false });
    expect(airport("X44")).toMatchObject({ kind: "seaplane-base", publicUse: true });
    expect(airport("AAF")).toMatchObject({ city: "Apalachicola", publicUse: true });
  });

  it("skips airports closed indefinitely", () => {
    expect(outcomes).toContainEqual({ ok: false, id: "80FA", reason: "closed" });
  });
});
