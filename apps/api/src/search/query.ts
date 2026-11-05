// What a search means, before the database sees it (docs/specs/0005-search.md): the words, a
// kind of result ("events", "clubs"), a town or ZIP code, Spanish words, synonyms and pinned
// answers. Pure functions, tested in query.test.ts. The database normalises its text the same
// way (search_norm in packages/db/migrations/0008_search_sync.sql): keep the two in step.
import type { SearchType } from "@workspace/shared";

export interface Point {
  latitude: number;
  longitude: number;
}

/** Florida's towns and ZIP codes, from the census (search.service.ts loads them). */
export interface Gazetteer {
  zip(code: string): Point | undefined;
  /** A normalised town name ("st petersburg") → its label and centre. */
  town(name: string): { label: string; point: Point } | undefined;
}

export interface ParsedQuery {
  /** The words to look for, normalised, without filler words. */
  words: string[];
  type: SearchType | null;
  near: { label: string; point: Point } | null;
  /** Documents that answer this search whatever the ranking says ("lessons" → the Lessons service). */
  pinned: string[];
}

/** Lower case, no accents, "R/C" → "rc", "1/8" → "8th", "fly-in" → "flyin", letters and digits. */
export function normalise(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\br\s*[/.]\s*c\b\.?/g, "rc")
    .replace(/\b1\/(\d+)\b/g, "$1th")
    .replace(/\bfly-?ins?\b|\bfly ins?$/g, "flyin")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Common Spanish words, read as their English twin (results stay in English).
const SPANISH: Record<string, string> = {
  avion: "plane",
  aviones: "planes",
  avioneta: "plane",
  helicoptero: "helicopter",
  helicopteros: "helicopters",
  dron: "drone",
  drones: "drones",
  carro: "car",
  carros: "cars",
  coche: "car",
  coches: "cars",
  camion: "truck",
  camiones: "trucks",
  barco: "boat",
  barcos: "boats",
  pista: "track",
  pistas: "tracks",
  campo: "field",
  campos: "fields",
  evento: "event",
  eventos: "events",
  carrera: "race",
  carreras: "races",
  competencia: "competition",
  competencias: "competition",
  clase: "lessons",
  clases: "lessons",
  leccion: "lessons",
  lecciones: "lessons",
  reglas: "rules",
  regla: "rule",
  registro: "register",
  registrar: "register",
  altura: "altitude",
  volar: "fly",
  vuelo: "flying",
  principiantes: "beginners",
  principiante: "beginners",
  escala: "scale",
  cerca: "near",
  en: "in",
};

const FILLER = new Set(
  (
    "a an the i me my we our you your it do does did can could should would how what where when which who " +
    "is are am be to of on at for with and or by from any some there here need want get go find show " +
    "rc de del la el los las y para un una mi mis donde como puedo hay que se"
  ).split(" "),
);
// Words before a town that mean "around there".
const NEAR = new Set(["near", "in", "around", "nearby", "close", "at"]);
// Words that only name a kind of result.
const TYPE_WORDS: Record<string, SearchType> = {
  event: "event",
  events: "event",
  club: "club",
  clubs: "club",
  guide: "guide",
  guides: "guide",
  rule: "rule",
  rules: "rule",
  place: "place",
  places: "place",
};
// Words that name a kind of result and still describe it ("car track", "rc field").
const TYPE_AND_WORD: Record<string, SearchType> = {
  field: "place",
  fields: "place",
  track: "place",
  tracks: "place",
};

/** Words that find each other. The last word typed is also matched as a prefix. */
export const SYNONYMS: readonly (readonly string[])[] = [
  ["heli", "helicopter", "helicopters", "chopper"],
  ["plane", "planes", "airplane", "airplanes", "aircraft"],
  ["drone", "drones", "uas", "quad"],
  ["car", "cars", "truck", "trucks", "buggy", "buggies"],
  ["crawler", "crawlers", "crawling"],
  ["register", "registration", "registered"],
  ["high", "altitude", "height", "400"],
  ["lesson", "lessons", "teach", "instructor", "training"],
  ["track", "tracks", "raceway", "circuit"],
  ["race", "races", "racing"],
  ["8th", "eighth"],
  ["10th", "tenth"],
  ["flyin", "flyins"],
];

export function synonymsOf(word: string): readonly string[] {
  return SYNONYMS.find((group) => group.includes(word)) ?? [word];
}

// Answers that must come first for some questions, by search document id. Matched against the
// normalised query; add one when the crew sees a search that ranking alone gets wrong.
const PINNED: { when: RegExp; ids: string[] }[] = [
  { when: /\b(lessons?|instructor|teach me|clases|leccion(es)?)\b/, ids: ["service:lessons"] },
  { when: /\b(how high|altitude|max(imum)? height|400 ?ft|altura)\b/, ids: ["rule:altitude"] },
  { when: /\bregist(er|ration|ro|rar)\b/, ids: ["rule:register"] },
];

export function parseQuery(q: string, gazetteer: Gazetteer): ParsedQuery {
  const text = normalise(q);
  const raw = text.split(" ").filter(Boolean);
  const words = raw.map((word) => SPANISH[word] ?? word);

  // A ZIP code anywhere, or a town that is the whole search or follows "near"/"in".
  let near: ParsedQuery["near"] = null;
  const zip = words.find((word) => /^\d{5}$/.test(word) && gazetteer.zip(word));
  if (zip) near = { label: zip, point: gazetteer.zip(zip)! };
  const meaningful = words.filter(
    (word) => !FILLER.has(word) && !TYPE_WORDS[word] && !NEAR.has(word),
  );
  for (let size = 3; size >= 1 && !near; size--) {
    for (let at = 0; at + size <= words.length && !near; at++) {
      const name = words.slice(at, at + size).join(" ");
      const town = gazetteer.town(name);
      if (!town) continue;
      // "cerca de Hialeah": skip filler words back to "near".
      let before = at - 1;
      while (before >= 0 && FILLER.has(words[before]!)) before--;
      if (meaningful.join(" ") === name || NEAR.has(words[before] ?? "")) near = town;
    }
  }

  let type: SearchType | null = null;
  const kept: string[] = [];
  for (const word of words) {
    if (word === zip) continue;
    if (TYPE_WORDS[word]) type = TYPE_WORDS[word];
    else if (TYPE_AND_WORD[word]) {
      type = TYPE_AND_WORD[word];
      kept.push(word);
    } else if (!FILLER.has(word) && !NEAR.has(word)) kept.push(word);
  }

  const pinned = PINNED.filter((pin) => pin.when.test(text)).flatMap((pin) => pin.ids);
  return { words: kept, type, near, pinned };
}

// Never counted as a search without results (spec 0005, privacy): an email, a phone number (seven
// digits or more) or a street address ("123 Main St").
const STREET =
  /\b\d{1,6}\s+(?:[\p{L}\d.'-]+\s+){0,3}(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|ter|terrace|hwy|highway|pkwy|parkway|cir|circle|trl|trail)\b\.?/iu;

export function looksPersonal(q: string): boolean {
  return /\S@\S/.test(q) || /(?:\d[\s().+-]*){7,}/.test(q) || STREET.test(q);
}
