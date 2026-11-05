import { z } from "zod";
import {
  FAA_SERVICES,
  floridaEnvelope,
  ringsOf,
  type QueryParams,
  type RawFeature,
} from "./arcgis.js";
import { boundingBox, simplifyRing, toPolygons, type Polygon } from "./geometry.js";
import { tidyName } from "./names.js";
import type { ReadOutcome } from "./sites.js";

// Controlled airspace over Florida from the FAA's Aeronautical Data Delivery Service (Class
// Airspace, public US government data). Kept: every class B, C and D part and class E surface
// area (E2, E3, E4) that reaches the ground, plus the class B shelves (higher floors), which
// "Can I fly here?" can mention. Class E that starts at 700 or 1,200 ft and class A are not
// kept: a recreational flight stays below 400 ft.

export const AIRSPACE_LAYER = `${FAA_SERVICES}/Class_Airspace/FeatureServer/0`;
export const AIRSPACE_DATASET = "https://adds-faa.opendata.arcgis.com/datasets/faa::class-airspace";

/** Outlines are simplified to within this many metres: plenty for a point check. */
export const SIMPLIFY_METERS = 15;

export const airspaceQuery: QueryParams = {
  where:
    "CLASS='B' OR (CLASS IN ('C','D') AND LOWER_VAL=0) OR " +
    "(LOCAL_TYPE IN ('CLASS_E2','CLASS_E3','CLASS_E4') AND LOWER_VAL=0)",
  ...floridaEnvelope(),
  outFields: "GLOBAL_ID,NAME,CLASS,LOCAL_TYPE,LOWER_VAL,LOWER_CODE,SECTOR",
  returnGeometry: true,
  geometryPrecision: 6,
  orderByFields: "OBJECTID",
};

const attributes = z.object({
  GLOBAL_ID: z.string().nullable(),
  NAME: z.string().nullable(),
  CLASS: z.string().nullable(),
  LOCAL_TYPE: z.string().nullable(),
  LOWER_VAL: z.number().nullable(),
  LOWER_CODE: z.string().nullable(),
  SECTOR: z.string().nullable(),
});

export interface AirspaceRow {
  id: string;
  name: string;
  class: string;
  lowerFt: number;
  rings: Polygon;
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const SURFACE_E = new Set(["CLASS_E2", "CLASS_E3", "CLASS_E4"]);

/**
 * One FAA feature → one row per polygon (a feature with two separate areas becomes `<id>` and
 * `<id>-2`). The floor is in feet: above the ground when the FAA says SFC, above sea level
 * otherwise (Florida is within 350 ft of sea level, so they are close).
 */
export function readAirspace(feature: RawFeature): ReadOutcome<AirspaceRow[]> {
  const parsed = attributes.safeParse(feature.attributes);
  if (!parsed.success) return { ok: false, id: "?", reason: "unreadable record" };
  const record = parsed.data;
  const id = record.GLOBAL_ID?.replace(/[{}]/g, "").toLowerCase();
  if (!id) return { ok: false, id: "?", reason: "no id" };
  const airspaceClass = record.CLASS?.trim().toUpperCase() ?? "";
  const lowerFt = Math.max(0, Math.round(record.LOWER_VAL ?? 0));
  const surface = lowerFt === 0;
  const kept =
    airspaceClass === "B" ||
    (surface && (airspaceClass === "C" || airspaceClass === "D")) ||
    (surface && airspaceClass === "E" && SURFACE_E.has(record.LOCAL_TYPE?.toUpperCase() ?? ""));
  if (!kept) return { ok: false, id, reason: "doesn't reach the ground" };

  const rings = ringsOf(feature.geometry);
  if (!rings?.length) return { ok: false, id, reason: "no area" };
  const polygons = toPolygons(rings)
    .map((polygon) => polygon.map((ring) => simplifyRing(ring, SIMPLIFY_METERS)))
    .filter((polygon) => polygon[0] && polygon[0].length >= 4);
  if (!polygons.length) return { ok: false, id, reason: "no area" };

  const sector =
    airspaceClass === "B" && record.SECTOR?.trim() ? ` (${tidyName(record.SECTOR.trim())})` : "";
  const name = `${tidyName(record.NAME?.trim() || `Class ${airspaceClass}`)}${sector}`;
  return {
    ok: true,
    value: polygons.map((polygon, index) => ({
      id: index ? `${id}-${index + 1}` : id,
      name,
      class: airspaceClass,
      lowerFt,
      rings: polygon,
      ...boundingBox(polygon),
    })),
  };
}
