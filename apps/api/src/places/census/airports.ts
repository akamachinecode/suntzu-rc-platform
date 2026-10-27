import { z } from "zod";
import { FAA_SERVICES, pointOf, type QueryParams, type RawFeature } from "./arcgis.js";
import { round6 } from "./geometry.js";
import { cityName, tidyName } from "./names.js";
import type { ReadOutcome } from "./sites.js";

// Airports, heliports and seaplane bases in Florida from the FAA's Aeronautical Data Delivery
// Service (the NASR airport list). Public US government data. Used by "Can I fly here?": the
// recreational flyer rules care about public-use airports nearby.

export const AIRPORTS_LAYER = `${FAA_SERVICES}/US_Airport/FeatureServer/0`;
export const AIRPORTS_DATASET = "https://adds-faa.opendata.arcgis.com/datasets/faa::airports-1";

export const airportsQuery: QueryParams = {
  where: "STATE='FL'",
  outFields: "IDENT,NAME,TYPE_CODE,SERVCITY,STATE,OPERSTATUS,PRIVATEUSE",
  returnGeometry: true,
  orderByFields: "IDENT",
};

const attributes = z.object({
  IDENT: z.string().nullable(),
  NAME: z.string().nullable(),
  TYPE_CODE: z.string().nullable(),
  SERVCITY: z.string().nullable(),
  STATE: z.string().nullable(),
  OPERSTATUS: z.string().nullable(),
  PRIVATEUSE: z.number().nullable(),
});

const KINDS: Record<string, string> = {
  AD: "airport",
  HP: "heliport",
  SP: "seaplane-base",
  GL: "gliderport",
  UL: "ultralight",
  BP: "balloonport",
};

export interface AirportRow {
  ident: string;
  name: string;
  kind: string;
  city: string | null;
  state: string;
  latitude: number;
  longitude: number;
  publicUse: boolean;
}

export function readAirport(feature: RawFeature): ReadOutcome<AirportRow> {
  const parsed = attributes.safeParse(feature.attributes);
  if (!parsed.success) return { ok: false, id: "?", reason: "unreadable record" };
  const record = parsed.data;
  const ident = record.IDENT?.trim().toUpperCase();
  if (!ident) return { ok: false, id: "?", reason: "no identifier" };
  if (record.STATE?.trim().toUpperCase() !== "FL")
    return { ok: false, id: ident, reason: "outside Florida" };
  // "INDEFINITE" is closed indefinitely: nobody needs to be told about a flight near it.
  if (record.OPERSTATUS && record.OPERSTATUS.toUpperCase() !== "OPERATIONAL")
    return { ok: false, id: ident, reason: "closed" };
  const position = pointOf(feature.geometry);
  if (!position) return { ok: false, id: ident, reason: "no position" };
  return {
    ok: true,
    value: {
      ident,
      name: tidyName(record.NAME ?? ident),
      kind: KINDS[record.TYPE_CODE?.toUpperCase() ?? ""] ?? "airport",
      city: cityName(record.SERVCITY) ?? null,
      state: "FL",
      latitude: round6(position.latitude),
      longitude: round6(position.longitude),
      publicUse: record.PRIVATEUSE === 0,
    },
  };
}
