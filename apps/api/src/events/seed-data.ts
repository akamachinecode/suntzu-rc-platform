import type { NewEvent, NewHost, NewPlace, NewSeries, NewSource } from "@workspace/db/schema";

// Starting data for the events engine: the hand-checked calendar and places of
// apps/app/src/content/events.ts and places.ts (checked 2026-10-20), and the candidate sources
// researched in docs/EVENTS-ENGINE.md (2026-10-21) and in the platform census (2026-10-27,
// DECISIONS.md). Links between rows use slugs; seed.ts turns them into ids. Apps can't import
// each other, so this is a copy: once /events reads from the API (roadmap A4), the app's
// events.ts goes away.

type WithLinks<T> = Omit<T, "hostId" | "placeId" | "seriesId"> & {
  host?: string;
  place?: string;
  series?: string;
};

export const HOSTS: NewHost[] = [
  {
    slug: "amps",
    name: "Aero Modelers of Perrine",
    kind: "club",
    amaClubNumber: 200,
    url: "https://www.amps-rc.com",
    aliases: ["AMPS"],
  },
  {
    slug: "markham-park-pilots",
    name: "Markham Park Pilots Association",
    kind: "club",
    amaClubNumber: 3229,
    url: "https://mppapilots.com",
    aliases: ["MPPA"],
  },
  {
    slug: "palm-beach-rc",
    name: "Palm Beach Radio Control Association",
    kind: "club",
    amaClubNumber: 1016,
    url: "https://www.palmbeachrc.com",
    aliases: ["PBRCA", "Palm Beach RC"],
  },
  {
    slug: "rc-bush-pilots",
    name: "RC Bush Pilots",
    kind: "club",
    amaClubNumber: 1829,
    url: "https://rcbushpilots.com",
  },
  {
    slug: "coral-springs-rc-track",
    name: "Coral Springs RC Track",
    kind: "track",
    url: "https://www.coralspringsrctrack.com/track-location/",
  },
  { slug: "deland-rc", name: "DeLand RC", kind: "club", url: "https://www.delandrc.com" },
  { slug: "ace-of-aces", name: "Ace of Aces", kind: "organiser", url: "https://aceofaces.org/" },
  // Clubs whose sites the engine reads or will read (platform census, 2026-10-27).
  {
    slug: "imperial-rc-club",
    name: "Imperial R/C Club",
    kind: "club",
    url: "https://imperialrcclub.com",
    aliases: ["IRCC", "Imperial Radio Control Club"],
  },
  {
    slug: "rcacf",
    name: "Remote Control Association of Central Florida",
    kind: "club",
    url: "https://rcacf.com",
    aliases: ["RCACF"],
  },
  {
    slug: "eglin-aero-modelers",
    name: "Eglin Aero Modelers",
    kind: "club",
    url: "https://eglinaeromodellers.org",
  },
  {
    slug: "martin-county-modelers",
    name: "Martin County Modelers",
    kind: "club",
    url: "https://mcmodelers.com",
  },
  {
    slug: "sarasota-rc-squadron",
    name: "Sarasota R/C Squadron",
    kind: "club",
    url: "https://www.sarasotarc.com",
    // The FAA register calls it "SRQ R/C Squadron" (AMA club 780): the census matches it here.
    amaClubNumber: 780,
    aliases: ["SRQ R/C Squadron"],
  },
  {
    slug: "sarasota-silent-flyers",
    name: "Sarasota Silent Flyers",
    kind: "club",
    url: "https://www.sarasotasilentflyers.com",
  },
  {
    slug: "triple-creek-rc",
    name: "Triple Creek RC Club",
    kind: "club",
    url: "https://www.triplecreekrc.com",
  },
];

// Coordinates: the centre of each field's FAA FRIA area (FAA UAS Data Delivery System, public
// data, read 2026-10-23), or the US Census geocoder for the car tracks' street addresses. The
// West Delray car track uses the park's address, so its pin is approximate.
export const PLACES: WithLinks<NewPlace>[] = [
  {
    slug: "silver-field",
    name: "Silver Field",
    kind: "flying-field",
    host: "amps",
    address: "20044 SW 168th St (west of Krome Ave)",
    city: "Miami",
    county: "Miami-Dade",
    // FAA record 2022-CBO-00118-FRIA (`pnpm census` links it): the seed must not unset the flag.
    isFria: true,
    notes: "AMA club 200. Home of Jets Over Miami every December.",
    url: "https://www.amps-rc.com",
    aliases: ["AMPS field"],
    latitude: 25.60495,
    longitude: -80.51998,
  },
  {
    slug: "markham-park",
    name: "Markham Park",
    kind: "flying-field",
    host: "markham-park-pilots",
    address: "16001 W State Road 84",
    city: "Sunrise",
    county: "Broward",
    isFria: true,
    notes:
      "AMA club 3229 and a FRIA. You'll need AMA membership, a park flying badge and club membership.",
    url: "https://mppapilots.com",
    latitude: 26.12643,
    longitude: -80.34863,
  },
  {
    slug: "west-delray-flying-field",
    name: "West Delray Regional Park flying field",
    kind: "flying-field",
    host: "palm-beach-rc",
    address: "10875 W Atlantic Ave",
    city: "Delray Beach",
    county: "Palm Beach",
    // FAA record 2023-CBO-00628-FRIA.
    isFria: true,
    notes: "AMA club 1016. Hosts 3D Over the Glades each February.",
    url: "https://www.palmbeachrc.com",
    latitude: 26.4647,
    longitude: -80.21779,
  },
  {
    slug: "dyer-park",
    name: "Dyer Park",
    kind: "flying-field",
    host: "rc-bush-pilots",
    address: "7301 Haverhill Rd",
    city: "West Palm Beach",
    county: "Palm Beach",
    isFria: true,
    notes: "AMA club 1829 and a FRIA, with a 700 ft altitude authorization.",
    url: "https://rcbushpilots.com",
    latitude: 26.78028,
    longitude: -80.1297,
  },
  {
    slug: "coral-springs-rc-track",
    name: "Coral Springs RC Track",
    kind: "car-track",
    host: "coral-springs-rc-track",
    address: "10500 NW 11th Manor (behind Petrillo Park)",
    city: "Coral Springs",
    county: "Broward",
    notes: "ROAR-sanctioned off-road and on-road racing.",
    url: "https://www.coralspringsrctrack.com/track-location/",
    latitude: 26.24548,
    longitude: -80.25945,
  },
  {
    slug: "west-delray-car-track",
    name: "West Delray Regional Park car track",
    kind: "car-track",
    address: "10875 W Atlantic Ave",
    city: "Delray Beach",
    county: "Palm Beach",
    notes: "County park with an RC car track alongside the flying field.",
    url: "https://discover.pbc.gov/parks/Amenities/Radio-Controlled.aspx",
    latitude: 26.45375,
    longitude: -80.21727,
  },
];

export const SERIES: WithLinks<NewSeries>[] = [
  {
    slug: "jets-over-deland",
    name: "Jets Over DeLand",
    kind: "fly-in",
    discipline: "air",
    host: "deland-rc",
    usualMonth: 11,
  },
  {
    slug: "jets-over-miami",
    name: "Jets Over Miami",
    kind: "fly-in",
    discipline: "air",
    host: "amps",
    place: "silver-field",
    usualMonth: 12,
    usualTiming: "Every December",
  },
  {
    slug: "snowbird-nationals",
    name: "Snowbird Nationals",
    kind: "competition",
    discipline: "ground",
    usualMonth: 1,
    usualTiming: "Late January or February",
  },
  {
    slug: "3d-over-the-glades",
    name: "3D Over the Glades",
    kind: "fly-in",
    discipline: "air",
    host: "palm-beach-rc",
    place: "west-delray-flying-field",
    usualMonth: 2,
    usualTiming: "February",
  },
  {
    slug: "jacksonville-jet-madness",
    name: "Jacksonville Jet Madness",
    kind: "fly-in",
    discipline: "air",
    usualMonth: 3,
    usualTiming: "March",
  },
  {
    slug: "ace-of-aces",
    name: "Ace of Aces",
    kind: "competition",
    discipline: "air",
    host: "ace-of-aces",
    usualMonth: 4,
    usualTiming: "April",
  },
  {
    slug: "sforcs",
    name: "South Florida Off Road Championship Series",
    kind: "competition",
    discipline: "ground",
    host: "coral-springs-rc-track",
    place: "coral-springs-rc-track",
    usualTiming: "Rounds through the season",
  },
];

export const EVENTS: WithLinks<NewEvent>[] = [
  {
    slug: "jets-over-deland-2026",
    name: "Jets Over DeLand",
    kind: "fly-in",
    discipline: "air",
    status: "confirmed",
    startDate: "2026-11-05",
    endDate: "2026-11-07",
    region: "florida",
    series: "jets-over-deland",
    host: "deland-rc",
    placeText: "DeLand, FL",
    summary: "Three days of turbine jets in Central Florida. Worth the drive up the turnpike.",
    url: "https://www.delandrc.com/jets-over-deland",
  },
  {
    slug: "jets-over-miami-2026",
    name: "Jets Over Miami",
    kind: "fly-in",
    discipline: "air",
    status: "confirmed",
    startDate: "2026-12-02",
    endDate: "2026-12-05",
    region: "south-florida",
    series: "jets-over-miami",
    host: "amps",
    place: "silver-field",
    summary:
      "South Florida's big jet weekend, held every December at the AMPS field west of Krome Avenue.",
    url: "https://www.modelaircraft.org/events/2026-jets-over-miami",
  },
  {
    slug: "snowbird-nationals-2027",
    name: "Snowbird Nationals",
    kind: "competition",
    discipline: "ground",
    status: "expected",
    startDate: "2027-01-01",
    datePrecision: "month",
    dateText: "Usually late January or February",
    region: "florida",
    series: "snowbird-nationals",
    placeText: "Orlando, FL",
    summary: "One of the biggest on-road car races of the winter. The 2026 edition was the 32nd.",
    url: "https://www.redrc.net/?p=236832",
  },
  {
    slug: "3d-over-the-glades-2027",
    name: "3D Over the Glades",
    kind: "fly-in",
    discipline: "air",
    status: "expected",
    startDate: "2027-02-01",
    datePrecision: "month",
    dateText: "Usually February",
    region: "south-florida",
    series: "3d-over-the-glades",
    host: "palm-beach-rc",
    place: "west-delray-flying-field",
    summary:
      "3D aerobatics, from hovering at a metre off the deck to flat spins. 2026 ran Feb 19–22.",
    url: "https://www.modelaircraft.org/events/3d-over-glades",
  },
  {
    slug: "jacksonville-jet-madness-2027",
    name: "Jacksonville Jet Madness",
    kind: "fly-in",
    discipline: "air",
    status: "expected",
    startDate: "2027-03-01",
    datePrecision: "month",
    dateText: "Usually March",
    region: "florida",
    series: "jacksonville-jet-madness",
    placeText: "Jacksonville, FL",
    summary: "A spring jet rally in North Florida. 2026 ran Mar 12–15.",
    url: "https://extremeflightrc.com/pages/event-schedule",
  },
  {
    slug: "ace-of-aces-2027",
    name: "Ace of Aces",
    kind: "competition",
    discipline: "air",
    status: "confirmed",
    startDate: "2027-04-07",
    endDate: "2027-04-10",
    region: "road-trip",
    series: "ace-of-aces",
    host: "ace-of-aces",
    placeText: "Triple Tree Aerodrome, South Carolina",
    summary:
      "Scale models judged on craftsmanship and flight, billed as the revival of Lakeland's Top Gun.",
    url: "https://aceofaces.org/",
  },
  {
    slug: "sforcs",
    name: "South Florida Off Road Championship Series",
    kind: "competition",
    discipline: "ground",
    status: "expected",
    startDate: "2027-01-01",
    datePrecision: "month",
    dateText: "Rounds through the season",
    region: "south-florida",
    series: "sforcs",
    host: "coral-springs-rc-track",
    place: "coral-springs-rc-track",
    sanctions: ["ROAR"],
    summary: "ROAR-sanctioned off-road racing. The best place in the area to race against a clock.",
    url: "https://www.coralspringsrctrack.com/track-location/",
  },
];

/** Where the seeded events come from: the crew's hand-checked calendar. */
export const CREW_SOURCE: NewSource = {
  slug: "servo-crew",
  name: "SunTzu RC crew, hand-checked calendar",
  url: "https://github.com/akamachinecode/rc-landing/blob/main/apps/app/src/content/events.ts",
  adapter: "manual",
  trust: "aggregator",
  status: "active",
  permission: "Our own data. Every event links to the organiser's page.",
};

// Every source says in `permission` what its robots.txt and terms said when it was checked.
// "active" ones are read by `pnpm engine`; candidates wait for a check, a fix or a yes;
// blocked ones are never read.
const DUALRATES_BLOCK =
  "DualRates club site. From the dev machine (Europe) every page, robots.txt included, " +
  "answers with DualRates' region block ('Access to this page is currently limited to " +
  "specific regions and verified networks', checked 2026-10-27), and the engine stops there. " +
  "Try again from the US deployment, or ask DualRates (roadmap D6); then set followLinks or " +
  "feedUrl from what the site publishes (schema.org events and iCal, DISCOVERY.md).";

export const SOURCES: WithLinks<NewSource>[] = [
  CREW_SOURCE,
  {
    slug: "deland-rc-calendar",
    name: "DeLand RC calendar",
    url: "https://www.delandrc.com/calendars",
    adapter: "ics",
    trust: "organiser",
    host: "deland-rc",
    region: "florida",
    permission:
      "Public Google Calendar, but calendar.google.com/robots.txt disallows automated access " +
      "(checked 2026-10-22). Needs the club's OK and an Itaca decision before it runs.",
    config: {
      feedUrl: "https://calendar.google.com/calendar/ical/delandrc%40gmail.com/public/basic.ics",
      discipline: "air",
    },
  },
  {
    slug: "coral-springs-rc-track-calendar",
    name: "Coral Springs RC Track calendar",
    url: "https://www.coralspringsrctrack.com/calendar/",
    adapter: "ics",
    trust: "organiser",
    host: "coral-springs-rc-track",
    region: "south-florida",
    checkEveryHours: 24,
    permission:
      "Public Google Calendar, blocked by calendar.google.com/robots.txt like DeLand's. " +
      "No entries after early 2026 (checked 2026-10-22): the track may post elsewhere now.",
    config: {
      feedUrl:
        "https://calendar.google.com/calendar/ical/6ifbdadkq20l72628rk39ris8g%40group.calendar.google.com/public/basic.ics",
      discipline: "ground",
    },
  },
  {
    slug: "amps-events",
    name: "AMPS events",
    url: "https://www.amps-rc.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "amps",
    region: "south-florida",
    permission:
      "robots.txt allows reading (checked 2026-10-22). Wix event pages carry schema.org data.",
    config: { platform: "wix", followLinks: "^/event-details", discipline: "air" },
  },
  {
    slug: "ama-event-calendar",
    name: "AMA event calendar (Florida)",
    url: "https://www.modelaircraft.org/event-calendar",
    adapter: "html",
    trust: "sanctioning-body",
    status: "blocked",
    region: "florida",
    permission: "Terms forbid commercial use of content. Ask AMA first (roadmap C5).",
  },
  {
    slug: "rcsignup",
    name: "RCSignup races in Florida",
    url: "https://rcsignup.com/rc-races/florida/",
    adapter: "json-ld",
    trust: "aggregator",
    status: "active",
    region: "florida",
    checkEveryHours: 24,
    permission:
      "robots.txt allows /rc-races/ and asks for 10 s between requests (Crawl-delay 10; /api/ " +
      "and racer profiles disallowed), checked 2026-10-27. The site publishes no terms of use " +
      "(home, events and Florida pages checked). The Florida page lists upcoming races as " +
      "schema.org SportsEvent data; we keep facts and link to each race's RCSignup page.",
    config: { platform: "rcsignup", discipline: "ground" },
  },
  {
    slug: "extreme-flight-schedule",
    name: "Extreme Flight event schedule",
    url: "https://extremeflightrc.com/pages/event-schedule",
    adapter: "html",
    trust: "aggregator",
    status: "active",
    region: "florida",
    permission:
      "robots.txt (Shopify) allows /pages/, checked 2026-10-27. The terms of service forbid " +
      "scraping only 'in violation of applicable law' and protect Extreme Flight's own text " +
      "and images: we keep dates, names and towns with a link, never their text. One page, " +
      "changes about once a season; US-wide, so only the Florida rows are kept.",
    config: {
      platform: "schedule-table",
      discipline: "air",
      onlyPlaces: ",\\s*FL$",
    },
  },
  {
    slug: "horizon-hobby-calendar",
    name: "Horizon Hobby events calendar",
    url: "https://www.horizonhobby.com/rc-events-calendar/",
    adapter: "html",
    trust: "aggregator",
    status: "blocked",
    permission:
      "robots.txt allows the page (checked 2026-10-27), but the terms of use say the site is " +
      "for personal, non-commercial use and forbid reproduction or re-publication of its " +
      "content without Horizon Hobby's written permission. Ask Horizon first. Once allowed: " +
      "the page carries its US events (~230 entries) as JSON (the `mobify-data` script: title, start and " +
      "end date, town), a short reader.",
  },
  {
    slug: "roar-nationals",
    name: "ROAR national races",
    url: "https://roarracing.com/national_races.php",
    adapter: "html",
    trust: "sanctioning-body",
    permission:
      "robots.txt allows everything but /join (checked 2026-10-27); the site publishes a " +
      "privacy policy and no terms of use. Not worth a reader: the national page gives no " +
      "dates and lists each host with a person's name, phone and email, the regional list " +
      "is empty, and ROAR-sanctioned Florida races reach the engine through RCSignup.",
  },
  {
    slug: "multigp-races",
    name: "MultiGP races and chapters",
    url: "https://www.multigp.com/races/upcoming-events/",
    adapter: "html",
    trust: "sanctioning-body",
    status: "blocked",
    region: "florida",
    permission:
      "robots.txt disallows /mgp/ (checked 2026-10-27), and the race finder and the chapter " +
      "list both load their data from /mgp/races and /mgp/chapters. A partnership with " +
      "MultiGP or a Florida chapter is the way in (roadmap D6).",
    config: { discipline: "fpv" },
  },
  {
    slug: "imperial-rc-events",
    name: "Imperial R/C Club events",
    url: "https://imperialrcclub.com/events/",
    adapter: "api",
    trust: "organiser",
    status: "active",
    host: "imperial-rc-club",
    region: "florida",
    permission:
      "robots.txt allows /wp-json/ (only cart, admin and upload logs are disallowed), checked " +
      "2026-10-27; no terms of use linked from the site. WordPress with The Events Calendar: " +
      "its public REST API lists upcoming events. Its ?ical=1 export answered empty.",
    config: {
      platform: "the-events-calendar",
      feedUrl: "https://imperialrcclub.com/wp-json/tribe/events/v1/events?per_page=50",
      discipline: "air",
    },
  },
  {
    slug: "rcacf-events",
    name: "RCACF events",
    url: "https://rcacf.com/events",
    adapter: "api",
    trust: "organiser",
    status: "active",
    host: "rcacf",
    region: "florida",
    permission:
      "robots.txt allows /events/ and asks for one request a minute (Request-rate 1/60, " +
      "Crawl-delay 10), checked 2026-10-27; the fetcher waits that long. No terms of use, a " +
      "privacy page only. Wild Apricot: the events RSS feed is the public machine-readable list.",
    config: {
      platform: "wild-apricot",
      feedUrl: "https://rcacf.com/events/RSS",
      discipline: "air",
    },
  },
  {
    slug: "eglin-aero-modelers-calendar",
    name: "Eglin Aero Modelers calendar",
    url: "https://eglinaeromodellers.org",
    adapter: "ics",
    trust: "organiser",
    host: "eglin-aero-modelers",
    region: "florida",
    permission:
      "Public Google Calendar embedded on the club's site (checked 2026-10-27), blocked by " +
      "calendar.google.com/robots.txt like DeLand's. Needs the club's OK first.",
    config: {
      platform: "google-calendar",
      feedUrl:
        "https://calendar.google.com/calendar/ical/eglinaeromodellersevents%40gmail.com/public/basic.ics",
      discipline: "air",
      timezone: "America/Chicago",
    },
  },
  {
    slug: "palm-beach-rc-site",
    name: "Palm Beach RC site",
    url: "https://www.palmbeachrc.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "palm-beach-rc",
    region: "south-florida",
    permission: DUALRATES_BLOCK,
    config: { platform: "dualrates", discipline: "air" },
  },
  {
    slug: "martin-county-modelers-site",
    name: "Martin County Modelers site",
    url: "https://mcmodelers.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "martin-county-modelers",
    region: "florida",
    permission: DUALRATES_BLOCK,
    config: { platform: "dualrates", discipline: "air" },
  },
  {
    slug: "sarasota-rc-squadron-site",
    name: "Sarasota R/C Squadron site",
    url: "https://www.sarasotarc.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "sarasota-rc-squadron",
    region: "florida",
    permission: DUALRATES_BLOCK,
    config: { platform: "dualrates", discipline: "air" },
  },
  {
    slug: "sarasota-silent-flyers-site",
    name: "Sarasota Silent Flyers site",
    url: "https://www.sarasotasilentflyers.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "sarasota-silent-flyers",
    region: "florida",
    permission: DUALRATES_BLOCK,
    config: { platform: "dualrates", discipline: "air" },
  },
  {
    slug: "triple-creek-rc-site",
    name: "Triple Creek RC Club site",
    url: "https://www.triplecreekrc.com",
    adapter: "json-ld",
    trust: "organiser",
    host: "triple-creek-rc",
    region: "florida",
    permission: DUALRATES_BLOCK,
    config: { platform: "dualrates", discipline: "air" },
  },
  {
    slug: "liverc",
    name: "LiveRC track directory",
    url: "https://live.liverc.com/",
    adapter: "html",
    trust: "aggregator",
    permission: "Discovery only: find tracks, then read each track's own calendar.",
    config: { use: "discovery" },
  },
];
