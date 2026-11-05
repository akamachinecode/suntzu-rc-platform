import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { queryUrl, type RawFeature } from "./arcgis.js";
import {
  FIXED_SITE_FIELDS,
  FIXED_SITES_LAYER,
  fixedSitesQuery,
  parseFixedSiteName,
  readFixedSite,
} from "./fixed-sites.js";
import { placeName, type CensusSite } from "./sites.js";

// fixed-sites.json: nine Florida records of the FAA's Recreational Flyer Fixed Sites layer
// (read 2026-10-27), with only the fields the census asks for (no point of contact).
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/fixed-sites.json", import.meta.url), "utf8"),
) as { features: RawFeature[] };
const now = new Date("2026-10-27T12:00:00Z");
const sites = fixture.features.flatMap((feature) => {
  const outcome = readFixedSite(feature, now);
  return outcome.ok ? [outcome.value] : [];
});
const named = (name: string): CensusSite => sites.find((site) => placeName(site.naming) === name)!;

describe("the fixed-site query", () => {
  it("never asks for the point of contact", () => {
    const url = queryUrl(FIXED_SITES_LAYER, fixedSitesQuery);
    expect(FIXED_SITE_FIELDS).not.toContain("POC");
    expect(url).not.toMatch(/POC|ZIP_CODE|outFields=\*/);
  });
});

describe("readFixedSite", () => {
  it("reads every record", () => {
    expect(sites).toHaveLength(9);
    expect(sites.map((site) => placeName(site.naming)).sort()).toEqual([
      "Carl Wegner Field",
      "Dyer Park",
      "Jensen Beach High School",
      "Moonport Modelers field",
      "One Wing Low Squadron field (SE 60th St)",
      "Sarasota County Park",
      "St Johns Solid Waste",
      "Tampa RC Aircraft Club field (Taylor Rd)",
      "West Field",
    ]);
  });

  it("reads a club's field with its ceiling and the record's date", () => {
    const tampa = named("Tampa RC Aircraft Club field (Taylor Rd)");
    expect(tampa).toMatchObject({
      register: "faa-fixed-site",
      registerId: "a912e12d-5232-4587-9e32-4e5d50f51cff",
      isFria: false,
      address: "Taylor Rd",
      city: "Seffner",
      latitude: 28.017459,
      host: { name: "Tampa RC Aircraft Club", kind: "club", registerId: "tamparcaircraft" },
    });
    expect(tampa.notes).toContain("authorised up to 700 ft");
    expect(tampa.verifiedAt.toISOString()).toBe("2025-06-03T00:00:00.000Z");
    expect(tampa.sourceUrl).toContain("recreational-flyer-fixed-sites/explore?location=28.017");
  });

  it("uses the FAA's site id when there is one", () => {
    expect(named("Moonport Modelers field")).toMatchObject({
      registerId: "20382",
      host: { name: "Moonport Modelers" },
    });
  });

  it("lists schools and parks without a host", () => {
    expect(named("Jensen Beach High School").host).toBeUndefined();
    expect(named("Jensen Beach High School").disciplines).toEqual([]);
    expect(named("Sarasota County Park").host).toBeUndefined();
  });
});

describe("parseFixedSiteName", () => {
  it("finds the club wherever the register puts it", () => {
    expect(parseFixedSiteName("West Field - TORCHS RC Heli Club")).toEqual({
      kind: "club",
      club: "TORCHS RC Heli Club",
      descriptor: "West Field",
    });
    expect(parseFixedSiteName("One Wing Low Squadron - OWLS - SE 60th St")).toEqual({
      kind: "club",
      club: "One Wing Low Squadron",
      descriptor: "SE 60th St",
      aliases: ["OWLS"],
    });
    expect(parseFixedSiteName("Saint Augustine RC Flyers-St Johns Solid Waste")).toEqual({
      kind: "club",
      club: "Saint Augustine RC Flyers",
      descriptor: "St Johns Solid Waste",
    });
    expect(parseFixedSiteName("Screaming Eagles Model Airplane Club, Gray site")).toEqual({
      kind: "club",
      club: "Screaming Eagles Model Airplane Club",
      descriptor: "Gray site",
    });
    expect(parseFixedSiteName("Mid-Florida R/C Club, Inc - Barfield Rd")).toEqual({
      kind: "club",
      club: "Mid-Florida R/C Club, Inc",
      descriptor: "Barfield Rd",
    });
  });

  it("tells places and schools from clubs", () => {
    expect(parseFixedSiteName("Seahawks Air Park")).toEqual({
      kind: "place",
      name: "Seahawks Air Park",
    });
    expect(parseFixedSiteName("Atlantic High School Air Force JROTC/FL-942")).toEqual({
      kind: "school",
      name: "Atlantic High School Air Force JROTC",
    });
  });
});
