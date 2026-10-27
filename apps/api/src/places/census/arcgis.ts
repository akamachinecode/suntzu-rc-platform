import { z } from "zod";
import type { CensusHttp } from "./http.js";

// Reading the FAA's ArcGIS feature services (the UAS Data Delivery System and the Aeronautical
// Data Delivery Service, https://udds-faa.opendata.arcgis.com). Every query names the fields it
// wants, asks for WGS 84 coordinates and pages through results with resultOffset.

export const FAA_SERVICES = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";

/** Florida and a little around it: [west, south, east, north]. */
export const FLORIDA_ENVELOPE = [-87.7, 24.3, -79.8, 31.1] as const;

export type QueryParams = Record<string, string | number | boolean>;

export function queryUrl(layerUrl: string, params: QueryParams): string {
  const search = new URLSearchParams({ f: "json", outSR: "4326" });
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `${layerUrl}/query?${search}`;
}

/** Query parameters that keep only features touching Florida's envelope. */
export function floridaEnvelope(): QueryParams {
  return {
    geometry: FLORIDA_ENVELOPE.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
  };
}

const position = z.tuple([z.number(), z.number()]).rest(z.number());
export const polygonGeometry = z.object({ rings: z.array(z.array(position)) });
export const pointGeometry = z.object({ x: z.number(), y: z.number() });

const feature = z.object({
  attributes: z.record(z.string(), z.unknown()),
  geometry: z.unknown().optional(),
});
export type RawFeature = z.infer<typeof feature>;

const page = z.union([
  z.object({ error: z.object({ code: z.number().optional(), message: z.string() }) }),
  z.object({ features: z.array(feature), exceededTransferLimit: z.boolean().optional() }),
]);

/** Every feature a query returns, page by page. */
export async function queryAll(
  http: CensusHttp,
  layerUrl: string,
  params: QueryParams,
  pageSize = 1000,
): Promise<RawFeature[]> {
  const features: RawFeature[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = queryUrl(layerUrl, {
      ...params,
      resultOffset: offset,
      resultRecordCount: pageSize,
    });
    const parsed = page.safeParse(await http.json(url));
    if (!parsed.success) throw new Error(`Unexpected response from ${layerUrl} (offset ${offset})`);
    const body = parsed.data;
    if ("error" in body) throw new Error(`ArcGIS error from ${layerUrl}: ${body.error.message}`);
    features.push(...body.features);
    if (!body.exceededTransferLimit && body.features.length < pageSize) return features;
    if (!body.features.length) return features;
  }
}

/** Esri rings as [lng, lat] pairs (drops any z or m values). */
export function ringsOf(geometry: unknown): [number, number][][] | undefined {
  const parsed = polygonGeometry.safeParse(geometry);
  if (!parsed.success) return undefined;
  return parsed.data.rings.map((ring) => ring.map(([x, y]): [number, number] => [x, y]));
}

export function pointOf(geometry: unknown): { latitude: number; longitude: number } | undefined {
  const parsed = pointGeometry.safeParse(geometry);
  return parsed.success ? { latitude: parsed.data.y, longitude: parsed.data.x } : undefined;
}
