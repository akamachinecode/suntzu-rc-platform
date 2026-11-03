import { z } from "zod";
import { FAA_SERVICES, ringsOf, type QueryParams, type RawFeature } from "./arcgis.js";
import { shapeCentroid } from "./geometry.js";
import { cityName, nameKey, tidyName, withoutCompanySuffix } from "./names.js";
import {
  clubHost,
  guessDisciplines,
  isoDay,
  isClubNotPlace,
  roadOf,
  registerMapUrl,
  type CensusSite,
  type HostCandidate,
  type ReadOutcome,
} from "./sites.js";

// FAA-Recognized Identification Areas (14 CFR Part 89): areas where drones and model aircraft
// may fly without Remote ID. Requested by FAA-recognised community-based organisations (CBO:
// the AMA for its chartered clubs, FPV Freedom Coalition, Flite Test Community Association) and
// by schools (EDU). Public US government data.

export const FRIA_LAYER = `${FAA_SERVICES}/FAA_Recognized_Identification_Areas/FeatureServer/0`;
export const FRIA_DATASET =
  "https://udds-faa.opendata.arcgis.com/datasets/faa::faa-recognized-identification-areas";

// The register also holds the requester's postal address and ZIP code: SunTzu RC never asks for them.
export const FRIA_FIELDS = [
  "refNumber",
  "title",
  "orgName",
  "city",
  "state",
  "startDate",
  "endDate",
];

export const friaQuery: QueryParams = {
  where: "state='FL'",
  outFields: FRIA_FIELDS.join(","),
  returnGeometry: true,
  orderByFields: "refNumber",
};

const attributes = z.object({
  refNumber: z.string().min(1),
  title: z.string().nullable(),
  orgName: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  startDate: z.number().nullable(),
  endDate: z.number().nullable(),
});

// Titles that don't work as a public name: a person's name in front of a school, a city code
// instead of a site. Keyed by record id; checked 2026-10-27.
const TITLE_FIXES: Record<string, string> = {
  "2023-EDU-02867-FRIA": "Yulee High School",
  "2024-CBO-00622-FRIA": "FPV Freedom Coalition Orlando",
};

const AMA = /academy of model aeronautics/i;

/** "2023-EDU-02867-FRIA-A1" → "2023-EDU-02867-FRIA": an amended record keeps the area's id. */
export function friaId(refNumber: string): string {
  return refNumber.trim().replace(/-[AR]\d+$/i, "");
}

/** "Southern Eagle Squadron #1707 - SE 144th Pl" → the club, its AMA charter and where. */
export function parseClubTitle(title: string): {
  club: string;
  number?: number;
  descriptor?: string;
} {
  const match = title.match(/^(.*?)\s*#\s*(\d+)\s*(?:-\s*(.*))?$/);
  let club = (match ? match[1]! : title).trim();
  let descriptor = match?.[3]?.trim() || undefined;
  // "Eglin Aero Modellers / Cat Island Park #221"
  const slash = club.match(/^(.*?)\s+\/\s+(.+)$/);
  if (slash && !descriptor) [club, descriptor] = [slash[1]!, slash[2]!];
  return {
    club,
    ...(match && { number: Number(match[2]) }),
    ...(descriptor && { descriptor }),
  };
}

/** Application titles carry form words: "FRIA Application for Celebration HS AFJROTC". */
export function siteTitle(title: string): string {
  // Capitals are judged on the whole title: "ESJ FRIA Application" keeps "ESJ".
  return tidyName(title)
    .replace(/^FRIA\s+(app\w*|request)\s*(for\b|:|-)?\s*/i, "")
    .replace(/\(updated\)/i, "")
    .replace(/\b(faa-)?fria(\s+app\w*)?\b/gi, "")
    .replace(/\s+-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanctioningBody(orgName: string): HostCandidate {
  const name = withoutCompanySuffix(tidyName(orgName));
  return {
    name,
    kind: "sanctioning-body",
    register: "faa-fria",
    registerId: `cbo-${nameKey(name)}`,
    aliases: [],
  };
}

export function readFria(feature: RawFeature, now: Date): ReadOutcome<CensusSite> {
  const parsed = attributes.safeParse(feature.attributes);
  if (!parsed.success) return { ok: false, id: "?", reason: "unreadable record" };
  const record = parsed.data;
  const id = friaId(record.refNumber);
  if (record.state?.trim().toUpperCase() !== "FL")
    return { ok: false, id, reason: "outside Florida" };
  if (record.endDate !== null && record.endDate < now.getTime())
    return { ok: false, id, reason: "expired" };
  const rings = ringsOf(feature.geometry);
  const centre = rings && shapeCentroid(rings);
  if (!centre) return { ok: false, id, reason: "no area" };

  // Only titles written all in capitals are re-cased; everything else is kept as written.
  const title = tidyName(TITLE_FIXES[id] ?? record.title ?? "");
  const school = id.split("-")[1]?.toUpperCase() === "EDU";
  const validUntil =
    record.endDate === null ? "" : `, valid until ${isoDay(new Date(record.endDate))}`;
  const base = {
    register: "faa-fria" as const,
    registerId: id,
    isFria: true,
    ...centre,
    ...(cityName(record.city) && { city: cityName(record.city)! }),
    sourceUrl: registerMapUrl(FRIA_DATASET, centre.latitude, centre.longitude),
    verifiedAt: record.startDate === null ? now : new Date(record.startDate),
  };

  if (school) {
    return {
      ok: true,
      value: {
        ...base,
        naming: { name: siteTitle(title) || id },
        disciplines: [],
        notes:
          "FAA-recognised identification area of a school or college, for its own programme. " +
          `FAA record ${id}${validUntil}.`,
      },
    };
  }

  const notes =
    "FAA-recognised identification area: drones and model aircraft without Remote ID may fly " +
    `inside it, with the pilot inside it too. FAA record ${id}${validUntil}.`;
  const club = parseClubTitle(title);
  if ((record.orgName && AMA.test(record.orgName)) || club.number) {
    // An AMA chartered club's field: the club, not the AMA, runs it.
    const clubLike =
      club.descriptor && isClubNotPlace(club.descriptor) ? club.descriptor : undefined;
    const host = clubHost(club.club, "faa-fria", {
      ...(club.number && { amaClubNumber: club.number }),
      aliases: clubLike ? [clubLike] : [],
    });
    const descriptor = club.descriptor && !clubLike ? club.descriptor : undefined;
    return {
      ok: true,
      value: {
        ...base,
        naming: { club: host.name, ...(descriptor && { descriptor }) },
        ...(roadOf(descriptor) && { address: roadOf(descriptor)! }),
        disciplines: guessDisciplines(title),
        notes,
        host,
      },
    };
  }

  // Another recognised organisation's site (FPV Freedom Coalition, Flite Test Community
  // Association): the site has its own name and the organisation is the host.
  return {
    ok: true,
    value: {
      ...base,
      naming: { name: siteTitle(title) || id },
      disciplines: guessDisciplines(`${record.orgName ?? ""} ${title}`),
      notes,
      ...(record.orgName?.trim() && { host: sanctioningBody(record.orgName) }),
    },
  };
}
