// Names from public registers: tidy capitals, slugs, and the keys used to match the same club
// spelled two ways ("Imperial RC Club Inc" and "Imperial Radio Control Club, Inc.").

// Words that stay in capitals when a register shouts ("MIAMI NAS CLASS D" → "Miami NAS Class D").
const ACRONYMS = new Set([
  "AFB",
  "AFJROTC",
  "AMA",
  "ARB",
  "BCF",
  "ERAU",
  "FAA",
  "FAU",
  "FL",
  "FPV",
  "FRIA",
  "HS",
  "II",
  "III",
  "IV",
  "JROTC",
  "KARS",
  "NE",
  "NAS",
  "NASA",
  "NJROTC",
  "NOLF",
  "OTOW",
  "PSL",
  "RC",
  "R/C",
  "ROTC",
  "SE",
  "STEM",
  "UAS",
  "US",
  "USA",
]);
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
]);
// Abbreviations without vowels that still read as words ("ST PETERSBURG" → "St Petersburg").
const ABBREVIATIONS = new Set([
  "BLVD",
  "CT",
  "DR",
  "FLD",
  "FT",
  "HWY",
  "LN",
  "MT",
  "PKWY",
  "PL",
  "RD",
  "RGNL",
  "ST",
]);

function capitalise(word: string): string {
  // "o'brien" → "O'Brien", "dade-collier" → "Dade-Collier", "130th" stays.
  return word
    .split(/([-'/])/)
    .map((part) =>
      part.replace(
        /^([^a-z0-9]*)([a-z])/,
        (_, lead: string, letter: string) => lead + letter.toUpperCase(),
      ),
    )
    .join("");
}

function titleWord(word: string, first: boolean): string {
  // Words already in mixed case ("DeFuniak", "McKendree") were written with care: keep them.
  if (/[a-z]/.test(word) && /[A-Z]/.test(word)) return word;
  // Numbers: "110TH" → "110th", "17A" stays.
  if (/^\d+(st|nd|rd|th)$/i.test(word)) return word.toLowerCase();
  if (/^\d+[a-z]?$/i.test(word)) return word.toUpperCase();
  const upper = word.toUpperCase();
  const bare = upper.replace(/[^A-Z/]/g, "");
  if (ACRONYMS.has(bare)) return upper;
  // Initials and codes with no vowels ("NW", "SR", "CR", "KHST") stay in capitals.
  if (bare.length > 1 && !/[AEIOUY]/.test(bare) && !ABBREVIATIONS.has(bare)) return upper;
  const lower = word.toLowerCase();
  if (!first && SMALL_WORDS.has(lower)) return lower;
  return capitalise(lower);
}

/** Collapses spaces and underscores; title-cases text that is all capitals or all lower case. */
export function tidyName(raw: string, options: { force?: boolean } = {}): string {
  const text = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const letters = text.replace(/[^a-z]/gi, "");
  const shouting = letters === letters.toUpperCase() || letters === letters.toLowerCase();
  if (!letters) return text;
  if (!shouting && !options.force) {
    // Written with care, but "Airmasters Rc Club" and "Quiet Birds Of Vero Beach" still slip.
    return text
      .replace(/\bRc\b/g, "RC")
      .replace(/(?<=\S )(Of|And)(?= )/g, (word) => word.toLowerCase());
  }
  return text
    .split(" ")
    .map((word, index) => titleWord(word, index === 0))
    .join(" ");
}

// Register typos in city names, fixed so place pages read right.
const CITY_FIXES: Record<string, string> = {
  "Ft Meade": "Fort Meade",
  Kissimee: "Kissimmee",
  Mararsyktown: "Masaryktown",
  "Zalfo Springs": "Zolfo Springs",
};

/** A city as the register wrote it, in title case ("FORT LAUDERDALE" → "Fort Lauderdale"). */
export function cityName(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const city = tidyName(raw, { force: true });
  return CITY_FIXES[city] ?? city;
}

/** "Avon Park Aeromodelers, Inc." → "Avon Park Aeromodelers". */
export function withoutCompanySuffix(name: string): string {
  return name
    .replace(/,?\s+(inc\.?|incorporated|llc)$/i, "")
    .replace(/[,\s]+$/, "")
    .trim();
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** The first of `base`, `base-<suffix>`, `base-2`, `base-3`… that isn't taken. */
export function uniqueSlug(base: string, taken: Set<string>, suffix?: string): string {
  const root = base || "place";
  if (!taken.has(root)) return root;
  const withSuffix = suffix ? `${root}-${slugify(suffix)}` : undefined;
  if (withSuffix && !taken.has(withSuffix)) return withSuffix;
  for (let n = 2; ; n++) {
    const candidate = `${withSuffix ?? root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

const KEY_WORDS: [RegExp, string][] = [
  [/&/g, " and "],
  [/\br\s*\/\s*c\b|\br\.\s*c\.?/g, " rc "],
  [/\bradio[\s-]+control(?:led)?\b/g, " rc "],
  [/\bmodellers\b/g, "modelers"],
  [/\bfliers\b/g, "flyers"],
  [/\bst\b\.?/g, " saint "],
  [/\bft\b\.?/g, " fort "],
  [/^\s*w\b\.?/g, " west "],
  [/^\s*e\b\.?/g, " east "],
  [/^\s*n\b\.?/g, " north "],
  [/^\s*s\b\.?/g, " south "],
];
const KEY_DROPPED = /\b(the|of|club|inc|incorporated|llc|co)\b/g;

/**
 * A spelling-proof key for an organisation's name: lower case, no punctuation, spaces or filler
 * words, "R/C" and "Radio Control" as "rc", and anything after "DBA" dropped.
 */
export function nameKey(name: string): string {
  let key = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+dba\s+.*$/, "")
    .replace(/\([^)]*\)/g, " ");
  for (const [pattern, replacement] of KEY_WORDS) key = key.replace(pattern, replacement);
  return key
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(KEY_DROPPED, " ")
    .replace(/\s+/g, "");
}

/**
 * A host's other names after a register adds some: new spellings that match differently from
 * the name and from every alias already there ("Imperial RC Club" adds nothing to "Imperial
 * Radio Control Club"; "LARKS" does).
 */
export function mergeAliases(name: string, aliases: string[], incoming: string[]): string[] {
  const merged = [...aliases];
  const keys = new Set([name, ...aliases].map(nameKey));
  for (const alias of incoming.map((value) => value.trim()).filter(Boolean)) {
    const key = nameKey(alias);
    if (!key || keys.has(key)) continue;
    keys.add(key);
    merged.push(alias);
  }
  return merged;
}

/** Edit distance, for keys that differ by a typo ("barnstomers", "aeromodlers"). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}
