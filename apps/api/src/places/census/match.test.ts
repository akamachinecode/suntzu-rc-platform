import { describe, expect, it } from "vitest";
import { findHost, findPlace, type KnownHost, type KnownPlace } from "./match.js";
import type { CensusSite, HostCandidate } from "./sites.js";

const place = (overrides: Partial<KnownPlace>): KnownPlace => ({
  id: "p",
  slug: "p",
  name: "P",
  kind: "flying-field",
  latitude: 26.12643,
  longitude: -80.34863,
  register: "crew",
  registerId: null,
  hostId: null,
  isFria: false,
  sourceUrl: null,
  verifiedAt: null,
  notes: "",
  ...overrides,
});

const site = (overrides: Partial<CensusSite>): CensusSite => ({
  register: "faa-fixed-site",
  registerId: "c2894ec1",
  naming: { name: "Markham Park Airfield" },
  isFria: false,
  latitude: 26.1258,
  longitude: -80.3486,
  disciplines: ["air"],
  notes: "",
  sourceUrl: "https://example.test",
  verifiedAt: new Date("2025-06-03"),
  ...overrides,
});

describe("findPlace", () => {
  const markham = place({ id: "markham", slug: "markham-park" });
  const track = place({ id: "track", kind: "car-track", latitude: 26.1258, longitude: -80.3486 });

  it("finds the record's own place first", () => {
    const own = place({
      id: "own",
      register: "faa-fixed-site",
      registerId: "c2894ec1",
      latitude: 27,
    });
    expect(findPlace(site({}), [markham, own])).toEqual({ place: own, how: "register" });
  });

  it("finds the flying field within 300 m, never a car track", () => {
    const match = findPlace(site({}), [track, markham]);
    expect(match).toMatchObject({ place: markham, how: "nearby" });
    expect(match && "meters" in match && match.meters).toBeLessThan(100);
    expect(
      findPlace(site({ latitude: 26.14161, longitude: -80.34764 }), [track, markham]),
    ).toBeUndefined();
  });

  it("finds the same club's field in the other register within 1,200 m", () => {
    const fria = place({ id: "fria", register: "faa-fria", registerId: "x", hostId: "club" });
    const far = site({ latitude: 26.135, longitude: -80.3486 }); // ~940 m north
    expect(findPlace(far, [fria], "club")).toMatchObject({ place: fria, how: "same-club" });
    expect(findPlace(far, [fria], "another-club")).toBeUndefined();
    expect(findPlace(far, [fria])).toBeUndefined();
    // Two records of the same register are two sites (a club's "site 1" and "site 2").
    expect(findPlace(far, [{ ...fria, register: "faa-fixed-site" }], "club")).toBeUndefined();
  });
});

describe("findHost", () => {
  const host = (overrides: Partial<KnownHost>): KnownHost => ({
    id: "h",
    slug: "h",
    name: "H",
    kind: "club",
    aliases: [],
    register: "crew",
    registerId: null,
    amaClubNumber: null,
    disciplines: [],
    ...overrides,
  });
  const candidate = (overrides: Partial<HostCandidate>): HostCandidate => ({
    name: "Bush Pilots",
    kind: "club",
    register: "faa-fria",
    registerId: "ama-1829",
    aliases: [],
    ...overrides,
  });
  const bushPilots = host({ id: "bush", name: "RC Bush Pilots", amaClubNumber: 1829 });
  const palmBeach = host({
    id: "pbrc",
    name: "Palm Beach Radio Control Association",
    aliases: ["PBRCA", "Palm Beach RC"],
    amaClubNumber: 1016,
  });

  it("matches the same record, then the AMA charter", () => {
    const own = host({ id: "own", register: "faa-fria", registerId: "ama-1829" });
    const chartered = candidate({ amaClubNumber: 1829 });
    expect(findHost(chartered, [bushPilots, own])).toEqual({ host: own, how: "register" });
    expect(findHost(chartered, [bushPilots])).toEqual({ host: bushPilots, how: "ama" });
  });

  it("matches names and aliases however they are spelled", () => {
    const fixed = candidate({
      name: "Palm Beach R/C Association",
      register: "faa-fixed-site",
      registerId: "x",
    });
    expect(findHost(fixed, [bushPilots, palmBeach])).toEqual({ host: palmBeach, how: "name" });
    const rcBush = candidate({
      name: "RC Bush Pilots",
      register: "faa-fixed-site",
      registerId: "y",
    });
    expect(findHost(rcBush, [bushPilots])).toMatchObject({ how: "name" });
  });

  it("matches a name one typo away, but not short or different names", () => {
    const ridge = host({
      id: "ridge",
      name: "Ridge Barnstomers of Lake Wales",
      amaClubNumber: 3372,
    });
    const typo = candidate({ name: "Ridge Barnstormers of Lake Wales", registerId: "z" });
    expect(findHost(typo, [ridge])).toEqual({ host: ridge, how: "similar" });
    expect(
      findHost(candidate({ name: "Collier Fun Flyers", registerId: "w" }), [ridge]),
    ).toBeUndefined();
  });

  it("never merges two AMA charters", () => {
    const other = candidate({
      name: "Palm Beach Radio Control Association",
      amaClubNumber: 9999,
      registerId: "ama-9999",
    });
    expect(findHost(other, [palmBeach])).toBeUndefined();
  });

  it("doesn't mistake a track or a shop for a club", () => {
    const track = host({ id: "t", name: "Coral Springs RC Track", kind: "track" });
    expect(
      findHost(candidate({ name: "Coral Springs RC Track", registerId: "v" }), [track]),
    ).toBeUndefined();
  });
});
