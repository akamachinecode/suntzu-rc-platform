import type { EventKind } from "@workspace/shared";
import type { SkipReason } from "./read.js";

// Club calendars mix events with meetings, chores and "no flying" notices. This decides from
// the entry's title what it is. Rules run in order and the first match wins; when a rule is
// wrong for one source, fix it here with a test from that source's fixture.

export type Classification =
  | { event: true; kind: EventKind; cancelled: boolean; name: string }
  | { event: false; reason: SkipReason };

const CANCELLED = /\s*[-–(]*\s*\bcancell?ed\b\s*\)?\s*/i;

const NOTICE =
  /\b(no flying|closed|tfr|spray(ed|ing)?|weeds?|mowing|layout|construction|parking)\b/i;
const CLUB_BUSINESS =
  /\b(volunteers?|set ?up|prep|board meeting|key exchange|dues|reservation|clean ?up|work ?day)\b/i;
const PRACTICE = /\b(practice|tba)\b/i;

const KINDS: [EventKind, RegExp][] = [
  [
    "fly-in",
    /\b(fun[- ]?fly|fly[- ]?in|air ?fest|aerofest|jets over|festival|fest|rally|jamboree|float fly|warbirds?)\b/i,
  ],
  ["swap-meet", /\bswap ?meet\b/i],
  ["competition", /\b(championships?|competition|contest|nationals|regional|cup|imac|pattern)\b/i],
  ["race", /\b(race|races|racing|grand prix)\b/i],
  ["show", /\b(air ?show|expo|show)\b/i],
  ["course", /\b(flight training|training|school|lessons?)\b/i],
  ["open-day", /\b(open house|open day|introduce a (friend|kid))\b/i],
];

const SOCIAL = /\b(meeting|bbq|breakfast|luncheon|lunch|dinner|party|memorial service)\b/i;

export function classify(title: string): Classification {
  const cancelled = CANCELLED.test(title);
  const name = title.replace(CANCELLED, " ").replace(/\s+/g, " ").trim() || title.trim();

  if (NOTICE.test(name)) return { event: false, reason: "notice" };
  if (CLUB_BUSINESS.test(name)) return { event: false, reason: "club-business" };
  if (PRACTICE.test(name)) return { event: false, reason: "practice" };
  for (const [kind, pattern] of KINDS) {
    if (pattern.test(name)) return { event: true, kind, cancelled, name };
  }
  if (SOCIAL.test(name)) return { event: false, reason: "club-business" };
  return { event: false, reason: "unrecognised" };
}
