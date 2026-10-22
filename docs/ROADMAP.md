# Roadmap

Status: **approved by the owner, 2026-10-22.** This is the working plan for the events engine and the community. The engine's design is in [`EVENTS-ENGINE.md`](./EVENTS-ENGINE.md); this file says what we index, how the community grows and in which order we build. Tick items off here as they land.

## Why

Three RC enthusiasts want the hobby to grow, with a useful, free, well-made platform people can take part in. What exists today and the principles that follow are in [`LANDSCAPE.md`](./LANDSCAPE.md).

## The idea in one line

Three ways in (open sources, discovery search, people), **one engine** (discover → fetch → extract with evidence → resolve → verify), one memory, and many ways out (a page per event, Google event results, ICS feeds, alerts, a public API, the mobile app).

## What we index

Not only events: the engine recognises and stores the whole graph of the hobby.

| What         | What it is                                                                                             | Why it matters                                                           | Where it comes from                                                                   | When  |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----- |
| Events       | Fly-ins, races, shows, swap meets, club open days, courses                                             | The core, and the growth channel (Google event results)                  | Club ICS feeds, JSON-LD, RCSignup, Extreme Flight, Horizon, ROAR; AMA with permission | Now   |
| Series       | Editions of the same event (Jets Over Miami 2025, 2026, 2027)                                          | Predicts the next edition before it is announced                         | Our own history                                                                       | Now   |
| Competitions | An event with a rulebook: sanctioning body (AMA, ROAR, MultiGP, IMAC, NSRCA), classes, fee, entry link | Racers and pilots search by class and sanction, not only by date         | The same sources; entries link to RCSignup, we don't replicate registration           | Now   |
| Places       | Flying fields, tracks, indoor venues, FAA-recognised identification areas (FRIAs)                      | Every event hangs off a place; the map of where to fly and race          | `places.ts`, AMA club finder, LiveRC, FAA FRIAs (to verify)                           | Now   |
| Hosts        | Clubs, tracks, shops, sanctioning bodies                                                               | What an organiser claims and verifies; the base of the community         | AMA club finder, club sites, events that mention them                                 | Now   |
| Results      | Winners per class, lap times, season standings                                                         | The event page stays useful after the event; series gain history         | LiveRC, RCScoring Pro, Speedhive, FPVScores (with permission)                         | Later |
| Rules        | FAA, TRUST, Remote ID, AMA and club rules                                                              | They change; telling people when they change builds trust                | `rules.ts` and the official pages, watched like any other source                      | Later |
| Conditions   | Temporary flight restrictions (Palm Beach during presidential visits), wind and rain per field         | "Can I fly at my field on Saturday?" is a reason to come back every week | FAA TFR list, api.weather.gov (to verify)                                             | Last  |

### The event lifecycle

`expected → announced → confirmed → changed → cancelled | held → results`, and the series then marks next year's edition as expected. One URL follows the event through its whole life, so each page builds value in search instead of expiring.

Each event stores: name, kind, discipline (air, rotor, ground, FPV), lifecycle state, dates with time zone, place and host; for competitions the sanctioning body, classes, fee, entry and results links; requirements (AMA, TRUST certificate, landing fee); and every source that mentions it, with the quote behind each field and the last-checked date.

## Community: a ladder of commitment

The community is utility around events and places, not a forum or a social network (Facebook groups already exist and moderation is expensive). Every rung also feeds the engine.

| Rung        | What they can do                                                                          | Needs                                                               |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Visitor     | Calendar, event, club and track pages; subscribe to the calendar (ICS)                    | Only the engine                                                     |
| Member      | Follow events, clubs and disciplines; mark "going"; change alerts; weekly digest          | Amazon SES, personal data (emails): Itaca review                    |
| Contributor | Submit an event by pasting text or a flyer; correct a field; report field status          | S3 uploads and AI extraction; enters as a source with its own trust |
| Organiser   | Claim a club or track, verified badge, publish and edit events, see "going", post results | Roles and permissions (Itaca review) and a way to verify identity   |
| Crew (us)   | Review console: evidence next to the source; approve, merge, correct, reject; moderate    | A `crew` role in the API: the first community piece we build        |

Later: pilot profiles and builds, and "find an instructor" linked to Servo's lessons.

## Order of work

Building no longer waits on AWS: the whole engine runs on a laptop against the local PostgreSQL in Docker. Deploying comes last.

### Track A — the engine, locally

- [x] **A1** Commit the dependency updates and the AWS agent rules.
- [x] **A2** Data model and Zod contracts: sources, fetches, sightings, events, event sightings, series, places, hosts, changes, reviews. Seed from `apps/app/src/content/events.ts` and `places.ts`.
- [x] **A3** Worker run from a command (`pnpm engine`): polite fetcher, ICS and JSON-LD readers, saved fixtures and Vitest tests. First live result: AeroFest and Jets Over Miami read from the AMPS site.
- [ ] **A3b** HTML readers, one per site: Extreme Flight, Horizon Hobby, ROAR, RCSignup (check robots.txt and terms first).
- [ ] **A3c** Resolve: match sightings to events (dates, place, name), create new events unpublished with a review. Needed for M1.
- [ ] **A4** Events API, `/events` reading from the API, `/events/[slug]` with schema.org `Event` data, ICS feed.
- [ ] **A5** Minimal crew console (needs the `crew` role: Itaca review).

### Track D — discovery first (owner's priority, 2026-10-22)

The engine is only as good as what it finds. Design: [`DISCOVERY.md`](./DISCOVERY.md). Reading more sites (A3b) waits until discovery is measured.

- [ ] **D1** Golden set (was B1): every Florida RC event through April 2027, verified by hand, as a reviewed CSV.
- [ ] **D2** Census v1: FAA FRIA and fixed sites, ROAR, RCSignup, LiveRC, AMYA, MultiGP into `hosts` and `places`; channel probe of every website.
- [ ] **D3** Discovery tables (`discovery_queries`, `discovery_runs`, `leads`, `lead_hits`) and the lead pipeline, with Parallel and Brave clients.
- [ ] **D4** Bake-off (was B3): Parallel FindAll, Parallel Search, Brave, Exa Websets and our own sources against the golden set; capture–recapture; choose the mix.
- [ ] **D5** Monitors and the weekly sweep, run from a command.
- [ ] **D6** Outreach: AMA, DualRates, MultiGP, RCSignup, Google Calendar clubs.

### Track B — research (can run in its own session)

- [ ] **B1** Golden set: moved to D1.
- [x] **B2** Check the new sources: FAA FRIAs, AMA club finder, results sites, club platforms (see `DISCOVERY.md`). TFRs still to check.
- [ ] **B3** Discovery bake-off: moved to D4.
- [ ] **B4** AI extraction with mandatory quotes, on real flyers, once there is access to Claude (Bedrock or the API).

### Track C — the owner and Itaca engineering

- [ ] **C1** Region: move `sst.config.ts` to us-east-2 or deploy to another account.
- [ ] **C2** Worker infrastructure: queue, schedule, S3.
- [ ] **C3** Name and domain, and the Cloudflare zone.
- [ ] **C4** Discovery API keys; send Parallel the question about their terms.
- [ ] **C5** Write to AMA District V and to a Florida MultiGP chapter.
- [ ] **C6** Club Google Calendars: `calendar.google.com/robots.txt` blocks automated reading. Ask DeLand RC (and other clubs) for permission or their feed, and decide with Itaca.

### Milestones

| #   | Milestone              | Done when                                                                                                          | Depends on      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| M1  | Live calendar, locally | The worker reads the open sources and `/events` comes from the database. AeroFest appears without anyone typing it | A1–A4, A3c, D1  |
| M2  | End-to-end demo        | A source changes → the worker notices → merges → the crew sees the evidence → approves → web and ICS update        | A5, D4, B4      |
| M3  | Deployed to `dev`      | The same, on AWS, with the worker on a schedule                                                                    | C1, C2, C3      |
| M4  | Members and organisers | Follow, "going", alerts, submit with a flyer, claim a club                                                         | SES, S3, roles  |
| M5  | Beyond Florida         | Discovery at scale, public API, Expo mobile app                                                                    | Capacity review |

## Decisions taken (2026-10-22)

- **Results:** link to the official results first. Store results ourselves only when an organiser publishes them with us (they carry people's names).
- **Region:** events from all of Florida; places and community for South Florida first.
- **Community:** utility first (follow, alerts, submit, claim). Social features when there are people.
- **Start:** A1–A3 now; the golden set (B1) in a parallel session.
- **Discovery first (2026-10-22, later the same day):** after A3 the owner put discovery ahead of reading more sites: Track D, designed in `DISCOVERY.md`.
