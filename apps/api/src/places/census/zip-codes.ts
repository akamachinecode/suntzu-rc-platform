import { round6 } from "./geometry.js";
import type { ReadOutcome } from "./sites.js";

// ZIP code centres from the US Census Bureau's Gazetteer files: one row per ZIP Code
// Tabulation Area (ZCTA) with its internal point. Public domain. Florida's ZIP codes start with
// 320–339 and 341–349 (340 is military mail abroad).

export const GAZETTEER_PAGE =
  "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html";

export function gazetteerUrl(year: number): string {
  return `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${year}_Gazetteer/${year}_Gaz_zcta_national.zip`;
}

export function isFloridaZip(zip: string): boolean {
  return /^3(2\d|3\d|4[1-9])\d\d$/.test(zip);
}

export interface ZipCodeRow {
  zip: string;
  latitude: number;
  longitude: number;
  state: string;
}

/**
 * Reads a Gazetteer ZCTA file. The columns are found by name (GEOID, INTPTLAT, INTPTLONG) and
 * the separator from the header: tabs until 2025, "|" from 2026.
 */
export function readGazetteer(text: string): {
  rows: ZipCodeRow[];
  skipped: { id: string; reason: string }[];
} {
  // A byte-order mark, if the file starts with one, isn't part of the header.
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/);
  const header = lines.shift() ?? "";
  const separator = header.includes("|") ? "|" : "\t";
  const columns = header.split(separator).map((name) => name.trim().toUpperCase());
  const [zipAt, latAt, lngAt] = ["GEOID", "INTPTLAT", "INTPTLONG"].map((name) =>
    columns.indexOf(name),
  ) as [number, number, number];
  if (zipAt < 0 || latAt < 0 || lngAt < 0)
    throw new Error(`Unexpected Gazetteer header: ${header.slice(0, 120)}`);

  const rows: ZipCodeRow[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(separator).map((cell) => cell.trim());
    const zip = cells[zipAt] ?? "";
    if (!isFloridaZip(zip)) continue;
    const outcome = zipCode(zip, cells[latAt], cells[lngAt]);
    if (outcome.ok) rows.push(outcome.value);
    else skipped.push({ id: outcome.id, reason: outcome.reason });
  }
  return { rows, skipped };
}

function zipCode(zip: string, lat?: string, lng?: string): ReadOutcome<ZipCodeRow> {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!lat || !lng || !Number.isFinite(latitude) || !Number.isFinite(longitude))
    return { ok: false, id: zip, reason: "no position" };
  return {
    ok: true,
    value: { zip, latitude: round6(latitude), longitude: round6(longitude), state: "FL" },
  };
}
