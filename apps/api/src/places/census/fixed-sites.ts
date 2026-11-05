import { z } from "zod";
import { FAA_SERVICES, type QueryParams, type RawFeature } from "./arcgis.js";
import { round6 } from "./geometry.js";
import { cityName, tidyName } from "./names.js";
import {
  clubHost,
  guessDisciplines,
  isClubNotPlace,
  roadOf,
  looksLikeClub,
  parseUsDate,
  registerMapUrl,
  type CensusSite,
  type ReadOutcome,
  type SiteName,
} from "./sites.js";

// Recreational flyer fixed sites: flying fields in controlled airspace that have an agreement
// with the FAA, where recreational flights are authorised up to the UAS facility map altitude.
// Public US government data.

export const FIXED_SITES_LAYER = `${FAA_SERVICES}/Recreational_Flyer_Fixed_Sites/FeatureServer/0`;
export const FIXED_SITES_DATASET =
  "https://udds-faa.opendata.arcgis.com/datasets/faa::recreational-flyer-fixed-sites";

// The register also names a point of contact (POC) and a ZIP code: SunTzu RC never asks for them.
export const FIXED_SITE_FIELDS = [
  "GLOBALID",
  "SITE_ID",
  "SITE_NAME",
  "CITY",
  "STATE",
  "LATITUDE",
  "LONGITUDE",
  "CEILING",
  "LAST_EDIT_DT",
];

export const fixedSitesQuery: QueryParams = {
  where: "STATE='FL'",
  outFields: FIXED_SITE_FIELDS.join(","),
  returnGeometry: false,
  orderByFields: "GLOBALID",
};

const attributes = z.object({
  GLOBALID: z.string().nullable(),
  SITE_ID: z.string().nullable(),
  SITE_NAME: z.string().nullable(),
  CITY: z.string().nullable(),
  STATE: z.string().nullable(),
  LATITUDE: z.number().nullable(),
  LONGITUDE: z.number().nullable(),
  CEILING: z.number().nullable(),
  LAST_EDIT_DT: z.string().nullable(),
});

const SCHOOL = /\b(high school|school|college|university|academy|a?f?n?jrotc)\b/i;

export type FixedSiteName =
  | { kind: "club"; club: string; descriptor?: string; aliases?: string[] }
  | { kind: "school" | "place"; name: string };

/**
 * "Tampa RC Aircraft Club Inc - Taylor Rd" → club and where; "Moonport Modelers 1" → the
 * club's first site; "Sarasota County Park" → a place with no club named.
 */
export function parseFixedSiteName(raw: string): FixedSiteName {
  // Only names written all in capitals are re-cased; everything else is kept as written.
  const text = tidyName(raw.replace(/\/FL-\d+\s*$/i, ""));
  if (SCHOOL.test(text)) return { kind: "school", name: text };

  const [first, ...rest] = text.split(/\s+-\s*|\s*-\s+/) as [string, ...string[]];
  if (rest.length) {
    // "One Wing Low Squadron - OWLS - SE 60th St": the acronym is another name for the club.
    const acronym = rest.length > 1 && /^[A-Z]{2,6}$/.test(rest[0]!) ? rest.shift() : undefined;
    const second = rest.join(" - ");
    // "West Field - TORCHS RC Heli Club": the club comes second.
    const swap = !looksLikeClub(first) && isClubNotPlace(second);
    return {
      kind: "club",
      club: swap ? second : first,
      descriptor: swap ? first : second,
      ...(acronym && { aliases: [acronym] }),
    };
  }
  // "Saint Augustine RC Flyers-St Johns Solid Waste"
  const glued = text.match(
    /^(.*\b(?:club|flyers|fliers|modell?ers|aviators|pilots|squadron|association|society))-(\S.*)$/i,
  );
  if (glued) return { kind: "club", club: glued[1]!, descriptor: glued[2]! };
  const comma = text.match(/^(.+?),\s+(.+)$/);
  if (comma && looksLikeClub(comma[1]!))
    return { kind: "club", club: comma[1]!, descriptor: comma[2]! };
  const numbered = text.match(/^(.*\S)\s+\d+$/);
  if (numbered) return { kind: "club", club: numbered[1]! };
  if (looksLikeClub(text)) return { kind: "club", club: text };
  return { kind: "place", name: text };
}

export function readFixedSite(feature: RawFeature, now: Date): ReadOutcome<CensusSite> {
  const parsed = attributes.safeParse(feature.attributes);
  if (!parsed.success) return { ok: false, id: "?", reason: "unreadable record" };
  const record = parsed.data;
  const id = record.SITE_ID?.trim() || record.GLOBALID?.replace(/[{}]/g, "").toLowerCase();
  if (!id) return { ok: false, id: "?", reason: "no id" };
  if (record.STATE?.trim().toUpperCase() !== "FL")
    return { ok: false, id, reason: "outside Florida" };
  const { LATITUDE: latitude, LONGITUDE: longitude } = record;
  if (latitude === null || longitude === null || !latitude || !longitude)
    return { ok: false, id, reason: "no position" };
  if (!record.SITE_NAME?.trim()) return { ok: false, id, reason: "no name" };

  const site = parseFixedSiteName(record.SITE_NAME);
  const ceiling = record.CEILING ? `up to ${record.CEILING.toLocaleString("en-US")} ft` : "";
  const notes =
    "FAA recreational flyer fixed site in controlled airspace: recreational flights are " +
    `authorised ${ceiling ? `${ceiling} ` : ""}under the site's agreement with the FAA (ask the ` +
    "club for its limits).";

  let naming: SiteName;
  let address: string | undefined;
  let host: CensusSite["host"];
  if (site.kind === "club") {
    host = clubHost(site.club, "faa-fixed-site", { aliases: site.aliases ?? [] });
    naming = { club: host.name, ...(site.descriptor && { descriptor: site.descriptor }) };
    address = roadOf(site.descriptor);
  } else {
    naming = { name: site.name };
  }

  return {
    ok: true,
    value: {
      register: "faa-fixed-site",
      registerId: id,
      naming,
      isFria: false,
      ...(address && { address }),
      ...(cityName(record.CITY) && { city: cityName(record.CITY)! }),
      latitude: round6(latitude),
      longitude: round6(longitude),
      disciplines: site.kind === "school" ? [] : guessDisciplines(record.SITE_NAME),
      notes,
      sourceUrl: registerMapUrl(FIXED_SITES_DATASET, latitude, longitude),
      verifiedAt: parseUsDate(record.LAST_EDIT_DT) ?? now,
      ...(host && { host }),
    },
  };
}
