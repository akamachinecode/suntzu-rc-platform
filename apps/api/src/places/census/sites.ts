import type { DISCIPLINES, HOST_KINDS, REGISTERS } from "@workspace/shared";
import { nameKey, withoutCompanySuffix } from "./names.js";

// What the FAA registers say about one flying site, before it is matched against the places
// and hosts Servo already knows. Shared by the FRIA and fixed-site readers.

export type SiteRegister = Extract<(typeof REGISTERS)[number], "faa-fria" | "faa-fixed-site">;
export type HostKind = (typeof HOST_KINDS)[number];
export type Discipline = (typeof DISCIPLINES)[number];

/** The organisation a register names for a site. Never a person. */
export interface HostCandidate {
  name: string;
  kind: HostKind;
  register: SiteRegister;
  /** Stable key within the register: "ama-1829", "cbo-fpvfreedomcoalition", a name key. */
  registerId: string;
  amaClubNumber?: number;
  /** Other names for it: an acronym in brackets, a "DBA" name, a club named in the title. */
  aliases: string[];
}

/**
 * How the site's name is built. A club's field without a name of its own is called after the
 * club, which is only known for sure once the host is matched ("DeLand RC field (Deland
 * Airport)"), so the parts are kept until then.
 */
export type SiteName = { name: string } | { club: string; descriptor?: string };

export interface CensusSite {
  register: SiteRegister;
  registerId: string;
  naming: SiteName;
  isFria: boolean;
  /** A road named in the register's title ("SE 144th Pl"), never a postal address. */
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  disciplines: Discipline[];
  notes: string;
  sourceUrl: string;
  verifiedAt: Date;
  host?: HostCandidate;
}

/** Every note the census writes opens with one of these, so it can tell its notes from the crew's. */
export const NOTE_OPENINGS = [
  "FAA-recognised identification area",
  "FAA recreational flyer fixed site",
] as const;

export function writtenByCensus(notes: string): boolean {
  return NOTE_OPENINGS.some((opening) => notes.startsWith(opening));
}

export type ReadOutcome<T> = { ok: true; value: T } | { ok: false; id: string; reason: string };

const ROAD_END =
  /\b(rd|road|st|street|ave|avenue|blvd|boulevard|dr|drive|ln|lane|hwy|highway|pl|place|way|trl|trail|pkwy|parkway|cir|circle|ct|court|ter|terrace)\.?(\s+(n|s|e|w|north|south|east|west))?$/i;
const ROAD_START = /^(cr|sr|fl|us|hwy|highway|st rd|county road|state road)\s*-?\s*\d+/i;

/** "SE 144th Pl", "CR 17A", "Hwy 90 W": a road, not a name. */
export function isRoad(text: string): boolean {
  // "SW 142nd Ave (South Runway)" is still a road.
  const road = text.replace(/\s*\([^)]*\)\s*$/, "");
  return ROAD_END.test(road) || ROAD_START.test(road);
}

/** The road in a descriptor, for the place's address: "SW 142nd Ave (North)" → "SW 142nd Ave". */
export function roadOf(descriptor: string | undefined): string | undefined {
  return descriptor && isRoad(descriptor) ? descriptor.replace(/\s*\([^)]*\)\s*$/, "") : undefined;
}

const NAMED_PLACE =
  /\b(field|airfield|air ?park|aerodrome|park|preserve|ranch|farms?|fairgrounds?|landfill|center|centre|course|waste|exposition|church|runway)\b/i;

/** "Parker Field", "Collier County Fairgrounds": the site has a name of its own. */
export function isNamedPlace(text: string): boolean {
  return NAMED_PLACE.test(text) && !isRoad(text);
}

const FIELD_NAME = /\b(field|airfield|aerodrome|air ?park|park)$/i;

/** The place's name: its own if the register gives one, else "<club> field (<where>)". */
export function placeName(naming: SiteName, hostName?: string): string {
  if ("name" in naming) return naming.name;
  const club = hostName ?? naming.club;
  const field = FIELD_NAME.test(club) ? club : `${club} field`;
  const { descriptor } = naming;
  if (!descriptor) return field;
  if (isNamedPlace(descriptor)) {
    // "Carl Wegner Field, Manatee Co RC": the field's name, without the club after it.
    const [name, after] = descriptor.split(/,\s+(?=[^,]+$)/);
    return after && looksLikeClub(after) ? name! : descriptor;
  }
  // "SW 142nd Ave (South Runway)" → "Vista View RC field (SW 142nd Ave, South Runway)"
  return `${field} (${descriptor.replace(/\s*\(([^)]*)\)/g, ", $1")})`;
}

const CLUB_WORDS =
  /\b(club|flyers|fliers|modell?ers|aeromodell?ers|aeromodlers|aviators|pilots|squadron|association|society|soaring|barnstormers|racers|controllers|rc|r\/c|rc'?ers|r\/cers|aero)\b/i;

/** Does the text read like a club's name? */
export function looksLikeClub(text: string): boolean {
  return CLUB_WORDS.test(text);
}

/** Is the text after a club's name another club name, not a place ("Rainbow RC Airpark")? */
export function isClubNotPlace(text: string): boolean {
  return looksLikeClub(text) && !isNamedPlace(text) && !isRoad(text);
}

/**
 * A club's name as a register writes it → a tidy name and its other names:
 * "Sanford Aero Modelers DBA Sam's" → "Sanford Aero Modelers" (also "Sam's"),
 * "Lake Aircraft Radio Kontrol Squad (LARKS)" → "Lake Aircraft Radio Kontrol Squad" (also "LARKS").
 */
export function clubName(raw: string): { name: string; aliases: string[] } {
  const aliases: string[] = [];
  let name = raw.replace(/\s+/g, " ").trim();
  const dba = name.match(/^(.*?)\s+dba\s+(.+)$/i);
  if (dba) {
    name = dba[1]!;
    aliases.push(dba[2]!.trim());
  }
  const bracket = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (bracket) {
    name = bracket[1]!;
    aliases.push(bracket[2]!.trim());
  }
  return { name: withoutCompanySuffix(name), aliases };
}

/** "air" for model aircraft clubs, "fpv" for drone racers, "rotor" for helicopter clubs. */
export function guessDisciplines(text: string, fallback: Discipline[] = ["air"]): Discipline[] {
  if (/\b(fpv|racers|drone racing|quads?)\b/i.test(text)) return ["fpv"];
  if (/\bheli(copter)?s?\b/i.test(text)) return ["rotor"];
  return fallback;
}

/** A host candidate for a club named by a register. */
export function clubHost(
  raw: string,
  register: SiteRegister,
  options: { amaClubNumber?: number; aliases?: string[] } = {},
): HostCandidate {
  const { name, aliases } = clubName(raw);
  return {
    name,
    kind: "club",
    register,
    registerId: options.amaClubNumber ? `ama-${options.amaClubNumber}` : nameKey(name),
    ...(options.amaClubNumber && { amaClubNumber: options.amaClubNumber }),
    aliases: [...aliases, ...(options.aliases ?? [])],
  };
}

/** Dates as the FAA writes them in text: "6/3/2025", "03/10/2021". */
export function parseUsDate(text: string | null | undefined): Date | undefined {
  const match = text?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, month, day, year] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 ? date : undefined;
}

/** "2023-10-01". */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A link that opens the FAA's own map of the register at the site, where anyone can click the
 * area and read the record.
 */
export function registerMapUrl(datasetUrl: string, latitude: number, longitude: number): string {
  return `${datasetUrl}/explore?location=${latitude.toFixed(6)},${longitude.toFixed(6)},16.00`;
}
