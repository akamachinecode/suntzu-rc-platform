import { describe, expect, it } from "vitest";
import {
  clubHost,
  guessDisciplines,
  isNamedPlace,
  isRoad,
  parseUsDate,
  placeName,
  roadOf,
  writtenByCensus,
} from "./sites.js";

describe("descriptors", () => {
  it("tells roads from names", () => {
    for (const road of [
      "SE 144th Pl",
      "CR 17A",
      "Hwy 90 W",
      "St Rd 100",
      "FL 46",
      "Aviation Dr. South",
      "Riverside Park Dr",
    ])
      expect(isRoad(road), road).toBe(true);
    for (const name of [
      "Parker Field",
      "Collier County Fairgrounds",
      "Rainbow RC Airpark",
      "Float Fly",
    ])
      expect(isRoad(name), name).toBe(false);
    expect(isNamedPlace("Riverside Park Dr")).toBe(false);
    expect(isNamedPlace("Nassau County Lofton Creek Landfill")).toBe(true);
    expect(roadOf("SW 142nd Ave (North)")).toBe("SW 142nd Ave");
    expect(roadOf("Parker Field")).toBeUndefined();
  });
});

describe("placeName", () => {
  it("prefers the field's own name, else the club's field and where", () => {
    expect(placeName({ name: "Atwater Park" })).toBe("Atwater Park");
    expect(placeName({ club: "Bay City Flyers" })).toBe("Bay City Flyers field");
    expect(placeName({ club: "Archer Field", descriptor: "Butterfly Lane" })).toBe(
      "Archer Field (Butterfly Lane)",
    );
    expect(placeName({ club: "Ancient City R/C Flyers", descriptor: "Parker Field" })).toBe(
      "Parker Field",
    );
    expect(placeName({ club: "Vista View RC", descriptor: "SW 142nd Ave (North)" })).toBe(
      "Vista View RC field (SW 142nd Ave, North)",
    );
    expect(
      placeName({
        club: "Manatee County Radio Controllers",
        descriptor: "Carl Wegner Field, Manatee Co RC",
      }),
    ).toBe("Carl Wegner Field");
  });

  it("uses the matched host's name when there is one", () => {
    expect(placeName({ club: "Deland RC Club", descriptor: "Deland Airport" }, "DeLand RC")).toBe(
      "DeLand RC field (Deland Airport)",
    );
  });
});

describe("clubHost", () => {
  it("keys AMA clubs by charter and keeps their other names", () => {
    expect(
      clubHost("Sanford Aero Modelers DBA Sam's", "faa-fria", { amaClubNumber: 1626 }),
    ).toEqual({
      name: "Sanford Aero Modelers",
      kind: "club",
      register: "faa-fria",
      registerId: "ama-1626",
      amaClubNumber: 1626,
      aliases: ["Sam's"],
    });
    expect(clubHost("Lake Aircraft Radio Kontrol Squad (LARKS)", "faa-fixed-site")).toMatchObject({
      name: "Lake Aircraft Radio Kontrol Squad",
      registerId: "lakeaircraftradiokontrolsquad",
      aliases: ["LARKS"],
    });
  });
});

it("guesses disciplines from names", () => {
  expect(guessDisciplines("Wolfpack Racers 1")).toEqual(["fpv"]);
  expect(guessDisciplines("TORCHS RC Heli Club")).toEqual(["rotor"]);
  expect(guessDisciplines("Tampa RC Aircraft Club")).toEqual(["air"]);
});

it("reads the FAA's text dates", () => {
  expect(parseUsDate("6/3/2025")?.toISOString()).toBe("2025-06-03T00:00:00.000Z");
  expect(parseUsDate("03/10/2021")?.toISOString()).toBe("2021-03-10T00:00:00.000Z");
  expect(parseUsDate("2/30/2025")).toBeUndefined();
  expect(parseUsDate(null)).toBeUndefined();
});

it("knows its own notes", () => {
  expect(writtenByCensus("FAA recreational flyer fixed site in controlled airspace…")).toBe(true);
  expect(writtenByCensus("AMA club 200. Home of Jets Over Miami every December.")).toBe(false);
});
