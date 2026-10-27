import {
  eq,
  getTableColumns,
  getTableName,
  inArray,
  sql,
  type AnyColumn,
  type Database,
  type SQL,
} from "@workspace/db";
import { airports, airspace, hosts, places, zipCodes } from "@workspace/db/schema";
import type { AirportRow } from "./airports.js";
import type { AirspaceRow } from "./airspace.js";
import { findHost, findPlace, type KnownHost, type KnownPlace } from "./match.js";
import { mergeAliases, slugify, uniqueSlug } from "./names.js";
import {
  placeName,
  writtenByCensus,
  type CensusSite,
  type HostCandidate,
  type SiteRegister,
} from "./sites.js";
import type { ZipCodeRow } from "./zip-codes.js";

// Writes what the census read. Places and hosts are matched before anything is added (see
// match.ts). Once a place or host exists, a later run only refreshes the register's facts
// (FRIA flag, source link, a newer date, a missing host): names, coordinates, access and notes
// belong to the crew and the place's steward from then on. Airports, airspace and ZIP codes are
// plain copies of the registers and are kept in step with them.

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface SitesReport {
  placesAdded: number;
  placesRefreshed: number;
  /** Crew places that now carry this register's record. */
  claimed: { registerId: string; slug: string }[];
  /** Records of a place already known: within 300 m, or the same club's field in the other register. */
  merged: { registerId: string; slug: string; meters: number; sameClub: boolean }[];
  hostsAdded: number;
  hostsMatched: number;
  /** Places from this register whose record is no longer in it: for the crew to look at. */
  missing: string[];
}

const placeColumns = {
  id: places.id,
  slug: places.slug,
  kind: places.kind,
  latitude: places.latitude,
  longitude: places.longitude,
  register: places.register,
  registerId: places.registerId,
  hostId: places.hostId,
  isFria: places.isFria,
  sourceUrl: places.sourceUrl,
  verifiedAt: places.verifiedAt,
  notes: places.notes,
  name: places.name,
};

const hostColumns = {
  id: hosts.id,
  slug: hosts.slug,
  name: hosts.name,
  kind: hosts.kind,
  aliases: hosts.aliases,
  register: hosts.register,
  registerId: hosts.registerId,
  amaClubNumber: hosts.amaClubNumber,
  disciplines: hosts.disciplines,
};

type NewPlaceValues = typeof places.$inferInsert;
type NewHostValues = typeof hosts.$inferInsert;

const fromRegister = (register: string) => register === "faa-fria" || register === "faa-fixed-site";

function later(a: Date | null, b: Date): Date {
  return a && a.getTime() >= b.getTime() ? a : b;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export async function loadSites(
  db: Database,
  register: SiteRegister,
  sites: CensusSite[],
): Promise<SitesReport> {
  const report: SitesReport = {
    placesAdded: 0,
    placesRefreshed: 0,
    claimed: [],
    merged: [],
    hostsAdded: 0,
    hostsMatched: 0,
    missing: [],
  };
  await db.transaction(async (tx) => {
    const knownPlaces: KnownPlace[] = await tx.select(placeColumns).from(places);
    const knownHosts: KnownHost[] = await tx.select(hostColumns).from(hosts);
    const placeSlugs = new Set(knownPlaces.map((place) => place.slug));
    const hostSlugs = new Set(knownHosts.map((host) => host.slug));
    const seen = new Set<string>();

    // A stable order, so two records of one field always merge the same way.
    const ordered = [...sites].sort((a, b) => a.registerId.localeCompare(b.registerId));
    for (const site of ordered) {
      seen.add(site.registerId);
      const host = site.host
        ? await upsertHost(tx, site.host, site, knownHosts, hostSlugs, report)
        : undefined;
      const match = findPlace(site, knownPlaces, host?.id);

      if (!match) {
        // Two fields of one club with no names of their own: the town tells them apart.
        const base = placeName(site.naming, host?.name);
        const clash = site.city && knownPlaces.some((place) => place.name === base);
        const name = clash ? `${base} (${site.city})` : base;
        const slug = uniqueSlug(slugify(name), placeSlugs, site.city);
        placeSlugs.add(slug);
        const [row] = await tx
          .insert(places)
          .values({
            slug,
            name,
            kind: "flying-field",
            hostId: host?.id ?? null,
            address: site.address ?? null,
            city: site.city ?? null,
            latitude: site.latitude,
            longitude: site.longitude,
            isFria: site.isFria,
            notes: site.notes,
            disciplines: site.disciplines,
            access: "permission",
            register: site.register,
            registerId: site.registerId,
            sourceUrl: site.sourceUrl,
            verifiedAt: site.verifiedAt,
          })
          .returning(placeColumns);
        knownPlaces.push(row!);
        report.placesAdded++;
        continue;
      }

      const { place } = match;
      const changes: Partial<NewPlaceValues> = {};
      if (site.isFria && !place.isFria) changes.isFria = true;
      if (!place.hostId && host) changes.hostId = host.id;
      if (match.how === "register") {
        report.placesRefreshed++;
        if (place.sourceUrl !== site.sourceUrl) changes.sourceUrl = site.sourceUrl;
        const verifiedAt = later(place.verifiedAt, site.verifiedAt);
        if (verifiedAt !== place.verifiedAt) changes.verifiedAt = verifiedAt;
      } else if (place.register === "crew" && place.registerId === null) {
        // A hand-checked place that this record is about: it now points at the record.
        Object.assign(changes, {
          register: site.register,
          registerId: site.registerId,
          sourceUrl: site.sourceUrl,
          verifiedAt: later(place.verifiedAt, site.verifiedAt),
        });
        report.claimed.push({ registerId: site.registerId, slug: place.slug });
      } else {
        if (!place.sourceUrl) changes.sourceUrl = site.sourceUrl;
        // A fixed site at a FRIA (or the reverse) adds what the other register says, on notes
        // the census wrote; the crew's own notes are left alone.
        if (
          writtenByCensus(place.notes) &&
          place.register !== site.register &&
          !place.notes.includes(site.notes)
        )
          changes.notes = `${place.notes} ${site.notes}`.trim();
        report.merged.push({
          registerId: site.registerId,
          slug: place.slug,
          meters: Math.round(match.meters),
          sameClub: match.how === "same-club",
        });
      }
      if (Object.keys(changes).length) {
        await tx.update(places).set(changes).where(eq(places.id, place.id));
        Object.assign(place, changes);
      }
    }

    report.missing = knownPlaces
      .filter(
        (place) => place.register === register && place.registerId && !seen.has(place.registerId),
      )
      .map((place) => place.registerId!);
  });
  return report;
}

async function upsertHost(
  tx: Tx,
  candidate: HostCandidate,
  site: CensusSite,
  knownHosts: KnownHost[],
  hostSlugs: Set<string>,
  report: SitesReport,
): Promise<KnownHost> {
  const match = findHost(candidate, knownHosts);
  if (!match) {
    const slug = uniqueSlug(slugify(candidate.name), hostSlugs, site.city);
    hostSlugs.add(slug);
    const aliases = mergeAliases(candidate.name, [], candidate.aliases);
    const [row] = await tx
      .insert(hosts)
      .values({
        slug,
        name: candidate.name,
        kind: candidate.kind,
        amaClubNumber: candidate.amaClubNumber ?? null,
        aliases,
        city: site.city ?? null,
        disciplines: site.disciplines,
        register: candidate.register,
        registerId: candidate.registerId,
      })
      .returning(hostColumns);
    knownHosts.push(row!);
    report.hostsAdded++;
    return row!;
  }

  const { host } = match;
  report.hostsMatched++;
  const changes: Partial<NewHostValues> = {};
  if (!host.amaClubNumber && candidate.amaClubNumber)
    changes.amaClubNumber = candidate.amaClubNumber;
  // Hosts the census created learn the other spellings the registers use; the crew's own
  // hosts are left as the crew wrote them.
  if (fromRegister(host.register)) {
    const aliases = mergeAliases(host.name, host.aliases, [candidate.name, ...candidate.aliases]);
    if (aliases.length !== host.aliases.length) changes.aliases = aliases;
    const disciplines = unique([...host.disciplines, ...site.disciplines]);
    if (disciplines.length !== host.disciplines.length)
      changes.disciplines = disciplines as NewHostValues["disciplines"];
  }
  if (Object.keys(changes).length) {
    await tx.update(hosts).set(changes).where(eq(hosts.id, host.id));
    Object.assign(host, changes);
  }
  return host;
}

// ---- Registers copied as they are: airports, airspace, ZIP codes ----

type Table = typeof airports | typeof airspace | typeof zipCodes;

/** `excluded."column"` for each key, so an upsert takes the new row's values. */
function excluded(table: Table, keys: string[]): Record<string, SQL> {
  const columns = getTableColumns(table) as Record<string, AnyColumn>;
  return Object.fromEntries(keys.map((key) => [key, sql.raw(`excluded."${columns[key]!.name}"`)]));
}

/** `(t.a, t.b) is distinct from (excluded.a, excluded.b)`: only rows that changed are written. */
function changed(table: Table, keys: string[]) {
  const columns = getTableColumns(table) as Record<string, AnyColumn>;
  const names = keys.map((key) => `"${columns[key]!.name}"`);
  const own = names.map((name) => `"${getTableName(table)}".${name}`);
  const incoming = names.map((name) => `excluded.${name}`);
  return sql.raw(`(${own.join(", ")}) is distinct from (${incoming.join(", ")})`);
}

function upsertSet(table: Table, keys: string[]): { set: Record<string, SQL>; setWhere: SQL } {
  const set: Record<string, SQL> = excluded(table, keys);
  if ("updatedAt" in getTableColumns(table)) set.updatedAt = sql`now()`;
  return { set, setWhere: changed(table, keys) };
}

export interface SyncReport {
  rows: number;
  /** Rows added or changed. */
  changed: number;
  removed: number;
  /** Set when stale rows were kept because the register looked incomplete. */
  keptStale?: number;
}

const CHUNK = 250;

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

/**
 * Removes rows the register no longer has, unless it suddenly returned less than half of what we
 * hold: then nothing is removed and the report says so.
 */
async function prune(
  tx: Tx,
  table: Table,
  key: typeof airports.ident | typeof airspace.id | typeof zipCodes.zip,
  wanted: Set<string>,
  report: SyncReport,
): Promise<void> {
  const existing = (await tx.select({ key }).from(table)) as { key: string }[];
  const stale = existing.map((row) => row.key).filter((value) => !wanted.has(value));
  if (!stale.length) return;
  if (wanted.size < existing.length / 2) {
    report.keptStale = stale.length;
    return;
  }
  for (const batch of chunks(stale)) await tx.delete(table).where(inArray(key, batch));
  report.removed = stale.length;
}

const AIRPORT_VALUES = ["name", "kind", "city", "state", "latitude", "longitude", "publicUse"];

export async function syncAirports(db: Database, rows: AirportRow[]): Promise<SyncReport> {
  const report: SyncReport = { rows: rows.length, changed: 0, removed: 0 };
  await db.transaction(async (tx) => {
    for (const batch of chunks(rows)) {
      const written = await tx
        .insert(airports)
        .values(batch)
        .onConflictDoUpdate({ target: airports.ident, ...upsertSet(airports, AIRPORT_VALUES) })
        .returning({ ident: airports.ident });
      report.changed += written.length;
    }
    await prune(tx, airports, airports.ident, new Set(rows.map((row) => row.ident)), report);
  });
  return report;
}

const AIRSPACE_VALUES = [
  "name",
  "class",
  "lowerFt",
  "rings",
  "minLat",
  "minLng",
  "maxLat",
  "maxLng",
];

export async function syncAirspace(db: Database, rows: AirspaceRow[]): Promise<SyncReport> {
  const report: SyncReport = { rows: rows.length, changed: 0, removed: 0 };
  await db.transaction(async (tx) => {
    for (const batch of chunks(rows)) {
      const written = await tx
        .insert(airspace)
        .values(batch)
        .onConflictDoUpdate({ target: airspace.id, ...upsertSet(airspace, AIRSPACE_VALUES) })
        .returning({ id: airspace.id });
      report.changed += written.length;
    }
    await prune(tx, airspace, airspace.id, new Set(rows.map((row) => row.id)), report);
  });
  return report;
}

const ZIP_VALUES = ["latitude", "longitude", "state"];

export async function syncZipCodes(db: Database, rows: ZipCodeRow[]): Promise<SyncReport> {
  const report: SyncReport = { rows: rows.length, changed: 0, removed: 0 };
  await db.transaction(async (tx) => {
    for (const batch of chunks(rows)) {
      const written = await tx
        .insert(zipCodes)
        .values(batch)
        .onConflictDoUpdate({ target: zipCodes.zip, ...upsertSet(zipCodes, ZIP_VALUES) })
        .returning({ zip: zipCodes.zip });
      report.changed += written.length;
    }
    await prune(tx, zipCodes, zipCodes.zip, new Set(rows.map((row) => row.zip)), report);
  });
  return report;
}
