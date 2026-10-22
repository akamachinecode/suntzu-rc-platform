# Events engine — design

Status: **proposal, 2026-10-21; build order approved 2026-10-22 in [`ROADMAP.md`](./ROADMAP.md)**, which also covers what we index beyond events and the community plan. Nothing here is built yet. Infrastructure pieces (database, queues, scheduled jobs, LLM calls) need Itaca engineering before production; see "What needs Itaca engineering" at the end.

## The goal

Be the place where an RC pilot or racer in Florida finds **every** event worth going to — fly-ins, competitions, races, club open days, swap meets — sooner and more accurately than anywhere else, and later do the same for the whole US.

Today the calendar is 7 events typed by hand in `src/content/events.ts`. Nobody becomes the reference by typing. The engine has to:

1. **Find** where events are published, including sources nobody has listed yet.
2. **Read** them, whatever the format (API, calendar feed, web page, PDF flyer).
3. **Understand** them: the same fly-in announced on the AMA calendar, the club's site and a forum post is one event, not three.
4. **Check** them: dates move, events get cancelled (hurricane season), and a wrong date makes someone drive four hours for nothing.
5. **Publish** them better than the source: one page per event, Google event results, a calendar people can subscribe to, alerts when something changes.
6. **Learn**: every correction by the crew, an organiser or a member makes the next run better.

The edge is not any single scraper. It is the **memory**: every source, every sighting, every edition of every recurring event, with the evidence behind each field. That is what lets us say "3D Over the Glades is usually the third weekend of February, not confirmed yet" before the club announces it, and what nobody else will bother to build.

## How it works

```text
 DISCOVER ──► FETCH ──► EXTRACT ──► RESOLVE ──► VERIFY ──► PUBLISH
 new sources   polite     fields +    one event   score,      pages, feeds,
 & feeds       crawler,   evidence    many        review,     alerts, API
               snapshots              sightings   change log
     ▲                                                          │
     └──────────── FEEDBACK (crew, organisers, members) ◄───────┘
```

### 1. Discover — the source graph

Worked out in detail, with the Florida census and the tool choice, in [`DISCOVERY.md`](./DISCOVERY.md).

A **source** is anything that publishes events: an API, a calendar feed, a club site, a track's Facebook page, a forum board. Sources live in a registry, not in code.

- **Seed** from directories that list clubs and tracks: AMA club finder (Florida is AMA District V), ROAR tracks, MultiGP chapters, the places we already know (`src/content/places.ts`).
- **Probe** each club or track site once to learn what it runs on and pick the cheapest reliable way to read it: a public Google Calendar embed (has an ICS feed), a WordPress events plugin (has a JSON API and ICS), schema.org `Event` data in the page, or plain HTML.
- **Expand**: events mention other clubs, venues and hosts; new names become candidate sources for the crew to approve.
- **Search sweeps**: a weekly set of searches ("fly-in Florida 2027", "RC race Broward") to catch one-off events and new sources.

Each source carries: adapter type, check frequency, trust level (official organiser > sanctioning body > aggregator > forum), region, and whether we are allowed to read it automatically (robots.txt and terms).

### 2. Fetch — a polite crawler

- Respects robots.txt and terms; identifies itself with a user agent and a contact URL.
- Conditional requests (ETag / Last-Modified) and per-host rate limits.
- Stores every raw response as a **snapshot** (Amazon S3). We can re-run extraction later without hitting the source again, and we can always show where a fact came from.
- Frequency adapts: a club page that changes twice a year is checked weekly; an event in the next 14 days is checked daily.

### 3. Extract — fields with evidence

Two kinds of extractor, cheapest first:

- **Structured adapters** (deterministic, free, exact): official APIs, ICS feeds, WordPress events JSON, schema.org JSON-LD.
- **AI extraction** for everything else: HTML pages, PDF flyers and flyer images (very common in this hobby). A language model fills the same schema and must **quote the text** that supports each field. A field without a quote is discarded. This keeps the model honest and makes review fast.

Output of this step is a **sighting**: "source X, at time T, said event Y happens on date D at place P", with the evidence.

### 4. Resolve — one event, many sightings

- **Events**: sightings that match on date window + venue + name similarity merge into one canonical event. Every field picks the value from the most trusted, most recent source, and keeps the others as history.
- **Venues**: resolved against our places (geocoded); "AMPS field", "Silver Field" and "west of Krome Ave" are the same place.
- **Series**: "Jets Over Miami 2025" and "2026" are editions of one series. Series let us predict the next edition (usual month, usual weekend) and show it as _expected, not confirmed_ — the same thing we do by hand today with `confirmed: false`.
- **Hosts**: clubs, tracks and organisers become entities with their own pages over time.

### 5. Verify — trust is a number

Each event gets a confidence score from: number of independent sources, their trust level, how recently they were seen, and whether they agree. Rules on top:

- New events from low-trust sources go to a **review queue**; events from an organiser's own feed can publish straight away.
- **Change detection**: date moved, venue changed, "CANCELLED" appears → the event is updated, the change is logged and followers are alerted.
- An event that disappears from its only source is not deleted silently; it is flagged for review.

### 6. Publish — better than the source

- **A page per event** (`/events/[slug]`) with dates, venue map, host, requirements (AMA membership, FAA TRUST certificate, landing fees), links to every source and a "last checked" date.
- **schema.org `Event` data** on every page, so the events can appear in Google's event results. This is the main growth channel.
- **Subscribe**: ICS feeds for everything, per region and per discipline (air, rotor, ground, FPV), so the calendar lives in people's phones.
- **Alerts**: "notify me if this changes", and a weekly "this weekend in South Florida" digest (email via Amazon SES).
- **Organiser claim**: a club can claim its events, correct them and get a verified badge. Corrections flow back as the highest-trust source.
- Later: a public, read-only API — other clubs and shops embedding our calendar is how we become the reference.

### 7. Feedback — the loop

Every review decision (merge, reject, correct a field) is stored. It tunes source trust, catches broken adapters (a source that suddenly yields nothing) and becomes test cases for the extractors.

## Sources for Florida (researched 2026-10-21)

Every source below was checked by hand on 2026-10-21. Terms and robots.txt change; re-check before turning a source on.

### Start with these

| #   | Source                                                                             | Covers                                | How we read it                                                                                                           |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Club and track Google Calendars (e.g. DeLand RC, Coral Springs RC Track)           | Club events, races, practice days     | Public ICS feed found in the site's calendar embed. Needs filtering: board meetings and "Practice" entries are mixed in. |
| 2   | schema.org `Event` data on club sites (e.g. AMPS, on Wix Events)                   | Club fly-ins                          | JSON-LD in each event page, with ISO dates and address.                                                                  |
| 3   | [AMA event calendar](https://www.modelaircraft.org/event-calendar), Florida filter | Air, heli, jets, drone racing (~40)   | HTML with state filter. **Ask AMA first**: their terms forbid commercial use of content.                                 |
| 4   | [RCSignup](https://rcsignup.com/events/) by state                                  | RC car races, the biggest car source  | HTML. robots.txt asks for 10 s between requests and blocks `/api/`.                                                      |
| 5   | [Extreme Flight event schedule](https://extremeflightrc.com/pages/event-schedule)  | 3D and jet events, many in Florida    | One HTML page, changes about once a season.                                                                              |
| 6   | [Horizon Hobby events calendar](https://www.horizonhobby.com/rc-events-calendar/)  | Sponsored air and car events, US-wide | HTML.                                                                                                                    |
| 7   | [ROAR national](https://roarracing.com/national_races.php) and regional races      | Sanctioned car nationals              | HTML, low volume, authoritative.                                                                                         |
| 8   | [LiveRC](https://live.liverc.com/) track subdomains                                | ~20 Florida car tracks                | Not an events feed: a directory to **discover** tracks, then read each track's own calendar.                             |

### Only with a partnership or permission

- **MultiGP** (FPV racing): the API needs a chapter key and the listings are blocked in robots.txt. Partner with a Florida chapter.
- **FPVScores**: their terms allow gentle automated access for clubs but ask to be contacted before building on their data.
- **AMA JSON API, Speedhive**: open but undocumented; ask before relying on them.

### Off-limits

- **Facebook** events and groups (where many clubs actually post): API access is for Marketing Partners only. **Reddit** (needs approval), **Meetup** (Pro plan, terms ban commercial scraping), **Eventbrite** (no search API since 2019).
- **RCGroups** and **RCUniverse**: block bots outright.
- Sites behind bot walls (Palm Beach RC on DualRates, RC Bush Pilots, Snowbird Nationals, AMA District V blog). We do not try to get around a bot wall.

### What this means

The best information in this hobby sits where machines can't read it: Facebook groups, bot-walled club platforms and flyers. So the engine can't win by scraping harder. It wins by being **the easiest place for an organiser to publish**: a 30-second submission form that reads a flyer or a Facebook link the organiser pastes, organiser claims, and partnerships with AMA District V, MultiGP chapters and the big tracks. Machine-readable sources give us the baseline; organisers give us the rest.

First proof: the AMA calendar and the AMPS site list **AeroFest, Miami, Nov 5–7**, which is not on our hand-typed calendar.

## Community

The community section uses the same engine:

- Event submissions ("Send us your event") become a source of type _member submission_ and go through resolve and verify like everything else.
- Club and track pages are built from the same entities (places, hosts) and show their upcoming events automatically.
- Member accounts (posting builds, following events, claiming a club) need authentication — Better Auth per the Itaca standard — and come after the events engine has data worth following.

## Data model (first cut)

| Table         | What it holds                                                                 |
| ------------- | ----------------------------------------------------------------------------- |
| `sources`     | Registry: URL, adapter, schedule, trust, region, allowed, health              |
| `snapshots`   | One row per fetch: source, time, status, content hash, S3 key                 |
| `sightings`   | One extracted event per snapshot, raw fields + evidence quotes                |
| `events`      | Canonical events: name, kind, discipline, dates, timezone, status, confidence |
| `event_links` | Which sightings support which event (many to one)                             |
| `series`      | Recurring events and their usual timing                                       |
| `places`      | Fields, tracks, venues; geocoded; county and region                           |
| `hosts`       | Clubs, tracks, organisers; AMA club number; claimed or not                    |
| `changes`     | Field-level history of every event (old value, new value, source, time)       |
| `reviews`     | Crew decisions on the queue, used as feedback                                 |

`src/content/events.ts` and `places.ts` become seed data for these tables.

## Phases

| Phase | What ships                                                                                                                                   | Needs                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 0     | Canonical event schema (Zod), structured adapters for the best Florida sources, run from a command on a laptop, output reviewed by hand      | Nothing new               |
| 1     | Database, source registry, scheduled fetches, review queue for the crew, `/events` reads from the database, event pages with schema.org data | PostgreSQL, scheduler, S3 |
| 2     | AI extraction for HTML and flyers, resolve and series prediction, change detection, ICS feeds                                                | LLM provider, queue       |
| 3     | Alerts and weekly digest, organiser claims, member accounts                                                                                  | Amazon SES, Better Auth   |
| 4     | Whole US: source discovery at scale, public API                                                                                              | Capacity review           |

Phase 0 proves which sources actually work before anyone pays for infrastructure. The current build order (tracks A–C and milestones M1–M5) is in [`ROADMAP.md`](./ROADMAP.md).

## What needs Itaca engineering

- **Database**: PostgreSQL (RDS / Aurora) + Drizzle, per the standard.
- **Scheduled and background work**: fetching and extraction cannot run inside page requests. Likely EventBridge schedules + SQS + Lambda (or Step Functions) defined in `sst.config.ts`. Engineering to choose and own.
- **Snapshot storage**: Amazon S3.
- **AI extraction**: LLM provider (Amazon Bedrock or the Anthropic API), cost budget and limits.
- **Geocoding**: Amazon Location Service or similar.
- **Legal**: which sources we may read automatically, and how we show third-party content (we link and summarise; we never copy flyers or descriptions wholesale).
