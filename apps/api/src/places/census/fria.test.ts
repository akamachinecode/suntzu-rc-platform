import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { queryUrl, type RawFeature } from "./arcgis.js";
import {
  FRIA_FIELDS,
  FRIA_LAYER,
  friaId,
  friaQuery,
  parseClubTitle,
  readFria,
  siteTitle,
} from "./fria.js";
import { placeName, type CensusSite } from "./sites.js";

// fria.json: ten Florida-area records of the FAA's FRIA layer (read 2026-10-27), with only the
// fields the census asks for. One title that starts with a person's name is replaced by a
// placeholder; the census replaces it too.
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/fria.json", import.meta.url), "utf8"),
) as { features: RawFeature[] };
const now = new Date("2026-10-27T12:00:00Z");
const outcomes = fixture.features.map((feature) => readFria(feature, now));
const sites = outcomes.flatMap((outcome) => (outcome.ok ? [outcome.value] : []));
const site = (id: string): CensusSite => sites.find((s) => s.registerId === id)!;

describe("the FRIA query", () => {
  it("never asks for the requester's address", () => {
    const url = queryUrl(FRIA_LAYER, friaQuery);
    expect(FRIA_FIELDS).toEqual([
      "refNumber",
      "title",
      "orgName",
      "city",
      "state",
      "startDate",
      "endDate",
    ]);
    expect(url).not.toMatch(/address|zipcode|outFields=\*/i);
    expect(new URL(url).searchParams.get("where")).toBe("state='FL'");
  });
});

describe("readFria", () => {
  it("keeps Florida records and skips the rest", () => {
    expect(sites).toHaveLength(9);
    expect(outcomes.filter((outcome) => !outcome.ok)).toEqual([
      { ok: false, id: "2023-CBO-03021-FRIA", reason: "outside Florida" },
    ]);
  });

  it("reads an AMA club's field: the club hosts it, the road is its address", () => {
    const field = site("2023-CBO-02732-FRIA");
    expect(field).toMatchObject({
      register: "faa-fria",
      isFria: true,
      naming: { club: "Southern Eagle Squadron", descriptor: "SE 144th Pl" },
      address: "SE 144th Pl",
      city: "Summerfield",
      disciplines: ["air"],
      host: {
        name: "Southern Eagle Squadron",
        kind: "club",
        register: "faa-fria",
        registerId: "ama-1707",
        amaClubNumber: 1707,
      },
    });
    expect(placeName(field.naming)).toBe("Southern Eagle Squadron field (SE 144th Pl)");
    expect(field.verifiedAt.toISOString()).toBe("2023-11-17T00:00:00.000Z");
    expect(field.notes).toContain("FAA record 2023-CBO-02732-FRIA, valid until 2027-11-30.");
    expect(field.sourceUrl).toBe(
      "https://udds-faa.opendata.arcgis.com/datasets/faa::faa-recognized-identification-areas" +
        "/explore?location=29.016363,-81.976646,16.00",
    );
    expect(field).toMatchObject({ latitude: 29.016363, longitude: -81.976646 });
  });

  it("names a field after the register's own name for it", () => {
    expect(placeName(site("2023-CBO-00197-FRIA").naming)).toBe("Parker Field");
    expect(site("2023-CBO-00197-FRIA").host?.name).toBe("Ancient City R/C Flyers");
    expect(placeName(site("2024-CBO-00121-FRIA").naming)).toBe("Cat Island Park");
    expect(site("2024-CBO-00121-FRIA").host?.name).toBe("Eglin Aero Modellers");
  });

  it("keeps a club named in the title as another name of the club", () => {
    const torchs = site("2023-CBO-01104-FRIA");
    expect(torchs.host).toMatchObject({
      name: "The Orlando Radio Control Helicopter Society",
      aliases: ["TORCHS RC Heli Club"],
    });
    expect(placeName(torchs.naming)).toBe("The Orlando Radio Control Helicopter Society field");
    expect(torchs.disciplines).toEqual(["rotor"]);
  });

  it("reads an AMA club without a charter number in the title", () => {
    expect(site("2023-CBO-01511-FRIA").host).toMatchObject({
      name: "Daytona Beach Radio Control Association",
      registerId: "daytonabeachrcassociation",
    });
  });

  it("hosts another organisation's site under that organisation", () => {
    const atwater = site("2024-CBO-00505-FRIA");
    expect(placeName(atwater.naming)).toBe("Atwater Park");
    expect(atwater.host).toMatchObject({
      name: "FPV Freedom Coalition",
      kind: "sanctioning-body",
      registerId: "cbo-fpvfreedomcoalition",
    });
    expect(atwater.disciplines).toEqual(["fpv"]);
  });

  it("lists school areas without a host and without form words", () => {
    expect(placeName(site("2023-EDU-02363-FRIA").naming)).toBe("Celebration HS AFJROTC");
    expect(placeName(site("2023-EDU-00143-FRIA").naming)).toBe("Tohopekaliga High School");
    expect(site("2023-EDU-00143-FRIA").host).toBeUndefined();
    expect(site("2023-EDU-00143-FRIA").disciplines).toEqual([]);
  });

  it("replaces titles that can't be shown, and keeps an amended record's id", () => {
    const yulee = site("2023-EDU-02867-FRIA");
    expect(placeName(yulee.naming)).toBe("Yulee High School");
    expect(JSON.stringify(sites)).not.toContain("Placeholder");
  });

  it("skips areas that have expired", () => {
    const [first] = fixture.features;
    const later = new Date("2031-01-01T00:00:00Z");
    expect(readFria(first!, later)).toMatchObject({ ok: false, reason: "expired" });
  });
});

describe("FRIA titles", () => {
  it("splits club, charter and where", () => {
    expect(parseClubTitle("Keystone Cloud Busters #4801 -St Rd 100")).toEqual({
      club: "Keystone Cloud Busters",
      number: 4801,
      descriptor: "St Rd 100",
    });
    expect(parseClubTitle("Bush Pilots #1829")).toEqual({ club: "Bush Pilots", number: 1829 });
  });

  it("removes application words", () => {
    expect(siteTitle("FRIA Appplication - J.R. Arnold High School - sUAS program")).toBe(
      "J.R. Arnold High School - sUAS program",
    );
    expect(siteTitle("Lakewood High School FRIA Application (Updated)")).toBe(
      "Lakewood High School",
    );
    expect(siteTitle("ESJ FRIA Application")).toBe("ESJ");
    expect(siteTitle("East Ridge High School - FRIA")).toBe("East Ridge High School");
  });

  it("drops amendment suffixes from ids", () => {
    expect(friaId("2023-EDU-02867-FRIA-A1")).toBe("2023-EDU-02867-FRIA");
    expect(friaId("2023-EDU-00942-FRIA-R1")).toBe("2023-EDU-00942-FRIA");
  });
});
