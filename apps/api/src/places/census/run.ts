import type { Database } from "@workspace/db";
import { readAirport, airportsQuery, AIRPORTS_LAYER, type AirportRow } from "./airports.js";
import { readAirspace, airspaceQuery, AIRSPACE_LAYER, type AirspaceRow } from "./airspace.js";
import { queryAll, type RawFeature } from "./arcgis.js";
import { FIXED_SITES_LAYER, fixedSitesQuery, readFixedSite } from "./fixed-sites.js";
import { FRIA_LAYER, friaQuery, readFria } from "./fria.js";
import type { CensusHttp } from "./http.js";
import {
  loadSites,
  syncAirports,
  syncAirspace,
  syncZipCodes,
  type SitesReport,
  type SyncReport,
} from "./load.js";
import type { CensusSite, ReadOutcome, SiteRegister } from "./sites.js";
import { unzipEntry } from "./unzip.js";
import { gazetteerUrl, readGazetteer } from "./zip-codes.js";

// The census: public registers in, places, hosts, airports, airspace and ZIP codes out. One
// dataset at a time, each in its own transaction. Reports name records by their register id and
// places by slug only: no titles, so nothing a register got wrong ends up in a log.

export const DATASETS = ["fria", "fixed-sites", "airports", "airspace", "zip-codes"] as const;
export type DatasetName = (typeof DATASETS)[number];

export interface CensusContext {
  db: Database;
  http: CensusHttp;
  now: Date;
}

export interface DatasetReport {
  dataset: DatasetName;
  lines: string[];
}

type Skipped = { id: string; reason: string }[];

function readAll<T>(features: RawFeature[], read: (feature: RawFeature) => ReadOutcome<T>) {
  const values: T[] = [];
  const skipped: Skipped = [];
  for (const feature of features) {
    const outcome = read(feature);
    if (outcome.ok) values.push(outcome.value);
    else skipped.push({ id: outcome.id, reason: outcome.reason });
  }
  return { values, skipped };
}

function skippedLine(skipped: Skipped): string[] {
  if (!skipped.length) return [];
  const counts = new Map<string, number>();
  for (const { reason } of skipped) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [`  skipped ${[...counts].map(([reason, count]) => `${count} ${reason}`).join(", ")}`];
}

function sitesLines(read: number, skipped: Skipped, report: SitesReport): string[] {
  return [
    `  ${read} records; places: ${report.placesAdded} added, ${report.placesRefreshed} already ` +
      `known, ${report.claimed.length} hand-checked places now linked to their record, ` +
      `${report.merged.length} records of a place already listed`,
    `  hosts: ${report.hostsAdded} added, ${report.hostsMatched} matched to a known host`,
    ...skippedLine(skipped),
    ...report.claimed.map(({ registerId, slug }) => `  = ${registerId} → ${slug}`),
    ...report.merged.map(
      ({ registerId, slug, meters, sameClub }) =>
        `  ~ ${registerId} → ${slug} (${meters} m${sameClub ? ", same club" : ""})`,
    ),
    ...(report.missing.length
      ? [`  ! no longer in the register (check by hand): ${report.missing.join(", ")}`]
      : []),
  ];
}

function syncLines(what: string, skipped: Skipped, report: SyncReport): string[] {
  return [
    `  ${report.rows} ${what}: ${report.changed} added or changed, ${report.removed} removed`,
    ...skippedLine(skipped),
    ...(report.keptStale
      ? [`  ! the register returned under half of what we hold: ${report.keptStale} kept`]
      : []),
  ];
}

async function sites(
  context: CensusContext,
  register: SiteRegister,
  layer: string,
  query: Parameters<typeof queryAll>[2],
  read: (feature: RawFeature, now: Date) => ReadOutcome<CensusSite>,
) {
  const features = await queryAll(context.http, layer, query);
  const { values, skipped } = readAll(features, (feature) => read(feature, context.now));
  const report = await loadSites(context.db, register, values);
  return sitesLines(features.length, skipped, report);
}

/** The latest Gazetteer year that is published (the Census Bureau adds one each autumn). */
async function latestGazetteer(context: CensusContext): Promise<string> {
  const year = context.now.getUTCFullYear();
  for (const candidate of [year, year - 1, year - 2]) {
    const url = gazetteerUrl(candidate);
    if ((await context.http.status(url)) === 200) return url;
  }
  throw new Error(`No Gazetteer ZCTA file found for ${year - 2}–${year}`);
}

export async function runDataset(
  dataset: DatasetName,
  context: CensusContext,
): Promise<DatasetReport> {
  switch (dataset) {
    case "fria":
      return {
        dataset,
        lines: await sites(context, "faa-fria", FRIA_LAYER, friaQuery, readFria),
      };
    case "fixed-sites":
      return {
        dataset,
        lines: await sites(
          context,
          "faa-fixed-site",
          FIXED_SITES_LAYER,
          fixedSitesQuery,
          readFixedSite,
        ),
      };
    case "airports": {
      const features = await queryAll(context.http, AIRPORTS_LAYER, airportsQuery);
      const { values, skipped } = readAll<AirportRow>(features, readAirport);
      return {
        dataset,
        lines: syncLines("airports", skipped, await syncAirports(context.db, values)),
      };
    }
    case "airspace": {
      // Airspace outlines are large: smaller pages keep each response a few megabytes.
      const features = await queryAll(context.http, AIRSPACE_LAYER, airspaceQuery, 50);
      const { values, skipped } = readAll<AirspaceRow[]>(features, readAirspace);
      const rows = values.flat();
      return { dataset, lines: syncLines("areas", skipped, await syncAirspace(context.db, rows)) };
    }
    case "zip-codes": {
      const url = await latestGazetteer(context);
      const { data } = unzipEntry(await context.http.bytes(url), (name) => name.endsWith(".txt"));
      const { rows, skipped } = readGazetteer(data.toString("utf8"));
      return {
        dataset,
        lines: [
          `  from ${url}`,
          ...syncLines("ZIP codes", skipped, await syncZipCodes(context.db, rows)),
        ],
      };
    }
  }
}
