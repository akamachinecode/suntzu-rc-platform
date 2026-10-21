/**
 * Events calendar. Every entry links to the organiser's page, which is the source of truth.
 * Dates last checked 2026-10-20. When an organiser hasn't announced dates, `when` says so
 * and `start` holds the usual month so the list still sorts.
 */

export type EventKind = "competition" | "show" | "fly-in";

export const KINDS: Record<EventKind, { label: string; plural: string }> = {
  competition: { label: "Competition", plural: "Competitions" },
  show: { label: "Show", plural: "Shows" },
  "fly-in": { label: "Fly-in", plural: "Fly-ins and meetups" },
};

export interface RcEvent {
  id: string;
  name: string;
  kind: EventKind;
  discipline: "air" | "rotor" | "ground";
  start: string; // ISO date; the first of the month when only the month is known
  end?: string;
  when: string; // how the date reads on the page
  confirmed: boolean;
  place: string;
  region: "South Florida" | "Florida" | "Road trip";
  host: string; // reads after the place, e.g. "Hosted by DeLand RC"
  summary: string;
  url: string;
}

export const EVENTS: RcEvent[] = [
  {
    id: "jets-over-deland-2026",
    name: "Jets Over DeLand",
    kind: "fly-in",
    discipline: "air",
    start: "2026-11-05",
    end: "2026-11-07",
    when: "Nov 5–7, 2026",
    confirmed: true,
    place: "DeLand, FL",
    region: "Florida",
    host: "Hosted by DeLand RC",
    summary: "Three days of turbine jets in Central Florida. Worth the drive up the turnpike.",
    url: "https://www.delandrc.com/jets-over-deland",
  },
  {
    id: "jets-over-miami-2026",
    name: "Jets Over Miami",
    kind: "fly-in",
    discipline: "air",
    start: "2026-12-02",
    end: "2026-12-05",
    when: "Dec 2–5, 2026",
    confirmed: true,
    place: "Silver Field, Miami",
    region: "South Florida",
    host: "Hosted by Aero Modelers of Perrine",
    summary:
      "South Florida's big jet weekend, held every December at the AMPS field west of Krome Avenue.",
    url: "https://www.modelaircraft.org/events/2026-jets-over-miami",
  },
  {
    id: "snowbird-nationals-2027",
    name: "Snowbird Nationals",
    kind: "competition",
    discipline: "ground",
    start: "2027-01-01",
    when: "Usually late January or February",
    confirmed: false,
    place: "Orlando, FL",
    region: "Florida",
    host: "Run by the Snowbird Nationals organisers",
    summary: "One of the biggest on-road car races of the winter. The 2026 edition was the 32nd.",
    url: "https://www.redrc.net/?p=236832",
  },
  {
    id: "3d-over-the-glades-2027",
    name: "3D Over the Glades",
    kind: "fly-in",
    discipline: "air",
    start: "2027-02-01",
    when: "Usually February",
    confirmed: false,
    place: "West Delray Regional Park, Delray Beach",
    region: "South Florida",
    host: "Hosted by the Palm Beach Radio Control Association",
    summary:
      "3D aerobatics, from hovering at a metre off the deck to flat spins. 2026 ran Feb 19–22.",
    url: "https://www.modelaircraft.org/events/3d-over-glades",
  },
  {
    id: "jacksonville-jet-madness-2027",
    name: "Jacksonville Jet Madness",
    kind: "fly-in",
    discipline: "air",
    start: "2027-03-01",
    when: "Usually March",
    confirmed: false,
    place: "Jacksonville, FL",
    region: "Florida",
    host: "Listed on Extreme Flight's event schedule",
    summary: "A spring jet rally in North Florida. 2026 ran Mar 12–15.",
    url: "https://extremeflightrc.com/pages/event-schedule",
  },
  {
    id: "ace-of-aces-2027",
    name: "Ace of Aces",
    kind: "competition",
    discipline: "air",
    start: "2027-04-07",
    end: "2027-04-10",
    when: "Apr 7–10, 2027",
    confirmed: true,
    place: "Triple Tree Aerodrome, South Carolina",
    region: "Road trip",
    host: "Run by Ace of Aces",
    summary:
      "Scale models judged on craftsmanship and flight, billed as the revival of Lakeland's Top Gun.",
    url: "https://aceofaces.org/",
  },
  {
    id: "sforcs",
    name: "South Florida Off Road Championship Series",
    kind: "competition",
    discipline: "ground",
    start: "2027-01-01",
    when: "Rounds through the season",
    confirmed: false,
    place: "Coral Springs RC Track",
    region: "South Florida",
    host: "Run at the Coral Springs RC Track",
    summary: "ROAR-sanctioned off-road racing. The best place in the area to race against a clock.",
    url: "https://www.coralspringsrctrack.com/track-location/",
  },
];

export const byDate = (a: RcEvent, b: RcEvent) => a.start.localeCompare(b.start);
