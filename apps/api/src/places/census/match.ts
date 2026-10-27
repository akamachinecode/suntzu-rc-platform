import { distanceMeters } from "./geometry.js";
import { editDistance, nameKey } from "./names.js";
import type { CensusSite, HostCandidate } from "./sites.js";

// How a register's site and organisation find what Servo already knows, so the census never
// adds a second Markham Park or a second Aero Modelers of Perrine. Pure: the loader passes the
// rows it read from the database.

/** A register site this close to a known flying field is that field. */
export const NEARBY_METERS = 300;
/**
 * A FRIA is an area and a fixed site is a point: the same club's field can sit up to this far
 * from the other register's record of it (the centre of a large area, the pits, the gate).
 */
export const SAME_CLUB_METERS = 1200;

export interface KnownPlace {
  id: string;
  slug: string;
  kind: string;
  latitude: number | null;
  longitude: number | null;
  register: string;
  registerId: string | null;
  hostId: string | null;
  isFria: boolean;
  sourceUrl: string | null;
  verifiedAt: Date | null;
  notes: string;
  name: string;
}

export interface KnownHost {
  id: string;
  slug: string;
  name: string;
  kind: string;
  aliases: string[];
  register: string;
  registerId: string | null;
  amaClubNumber: number | null;
  disciplines: string[];
}

export type PlaceMatch =
  | { place: KnownPlace; how: "register" }
  | { place: KnownPlace; how: "nearby" | "same-club"; meters: number };

function nearest(
  site: CensusSite,
  places: KnownPlace[],
  maxMeters: number,
  accept: (place: KnownPlace) => boolean,
): { place: KnownPlace; meters: number } | undefined {
  let best: { place: KnownPlace; meters: number } | undefined;
  for (const place of places) {
    if (place.kind !== "flying-field" || place.latitude === null || place.longitude === null)
      continue;
    if (!accept(place)) continue;
    const meters = distanceMeters(site, { latitude: place.latitude, longitude: place.longitude });
    if (meters <= maxMeters && (!best || meters < best.meters)) best = { place, meters };
  }
  return best;
}

/**
 * The place this site already is: the same register record; else the nearest flying field
 * within 300 m; else, for a site whose club is known, that club's field from the other FAA
 * register within 1,200 m.
 */
export function findPlace(
  site: CensusSite,
  places: KnownPlace[],
  hostId?: string,
): PlaceMatch | undefined {
  const own = places.find(
    (place) => place.register === site.register && place.registerId === site.registerId,
  );
  if (own) return { place: own, how: "register" };
  const near = nearest(site, places, NEARBY_METERS, () => true);
  if (near) return { ...near, how: "nearby" };
  if (!hostId) return undefined;
  const sameClub = nearest(
    site,
    places,
    SAME_CLUB_METERS,
    (place) =>
      place.hostId === hostId &&
      place.register !== site.register &&
      (place.register === "faa-fria" || place.register === "faa-fixed-site"),
  );
  return sameClub && { ...sameClub, how: "same-club" };
}

export type HostMatch = { host: KnownHost; how: "register" | "ama" | "name" | "similar" };

/** Keys long enough to mean something ("rc" alone would match half of Florida). */
function keysOf(names: string[]): Set<string> {
  return new Set(names.map(nameKey).filter((key) => key.length >= 4));
}

function compatible(candidate: HostCandidate, host: KnownHost): boolean {
  // Two AMA charters are two clubs, however alike their names.
  if (
    candidate.amaClubNumber &&
    host.amaClubNumber &&
    candidate.amaClubNumber !== host.amaClubNumber
  )
    return false;
  return (
    candidate.kind === host.kind || host.kind === "organiser" || candidate.kind === "organiser"
  );
}

/**
 * The host a register's organisation already is, in order of certainty: the same register
 * record, the same AMA charter number, the same name or alias once spelling is ignored, then a
 * name one or two typos away ("Barnstomers"), for names long enough to be unambiguous.
 */
export function findHost(candidate: HostCandidate, hosts: KnownHost[]): HostMatch | undefined {
  const own = hosts.find(
    (host) => host.register === candidate.register && host.registerId === candidate.registerId,
  );
  if (own) return { host: own, how: "register" };
  if (candidate.amaClubNumber) {
    const charter = hosts.find((host) => host.amaClubNumber === candidate.amaClubNumber);
    if (charter) return { host: charter, how: "ama" };
  }
  const wanted = keysOf([candidate.name, ...candidate.aliases]);
  const named = hosts.find(
    (host) =>
      compatible(candidate, host) &&
      [...keysOf([host.name, ...host.aliases])].some((key) => wanted.has(key)),
  );
  if (named) return { host: named, how: "name" };

  const key = nameKey(candidate.name);
  if (key.length < 12) return undefined;
  let closest: { host: KnownHost; distance: number } | undefined;
  for (const host of hosts) {
    if (!compatible(candidate, host)) continue;
    const hostKey = nameKey(host.name);
    if (hostKey.length < 12 || Math.abs(hostKey.length - key.length) > 2) continue;
    const distance = editDistance(key, hostKey);
    if (distance <= 2 && (!closest || distance < closest.distance)) closest = { host, distance };
  }
  return closest && { host: closest.host, how: "similar" };
}
