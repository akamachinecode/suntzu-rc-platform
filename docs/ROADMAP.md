# Roadmap

Status: **approved by the owner, 2026-10-22; Servo 1.0 plan approved 2026-10-27.** This is the working plan for the events engine and the community. The engine's design is in [`EVENTS-ENGINE.md`](./EVENTS-ENGINE.md); this file says what we index, how the community grows and in which order we build. Tick items off here as they land.

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

## Servo 1.0 — the plan to launch (approved 2026-10-27)

The owner asked to finish the web as version 1: the events and the community, ready to launch in Florida. Each phase is a specification in [`specs/`](./specs/README.md), built slice by slice and ticked off there.

| Phase | What                                                                                            | Spec                                             |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 0     | Stack refreshed to `create-itaca@0.2.3` (skills, docs, tracing, security, origin lock) — done   | `DECISIONS.md`, 2026-10-27                       |
| 1     | Events that keep themselves current: resolve, crew console, living event page, finding, readers | [`0001-events.md`](./specs/0001-events.md)       |
| 2     | Places and clubs: census, `/places`, club pages, "Can I fly here?"                              | [`0002-places.md`](./specs/0002-places.md)       |
| 3     | Community: accounts, follow and "going", contribute, organisers, newcomers, emails              | [`0003-community.md`](./specs/0003-community.md) |
| 4     | Launch: infrastructure in `us-east-2`, Turnstile, legal pages, the owner's checklist            | [`0004-launch.md`](./specs/0004-launch.md)       |
| 5     | Search across the site: one box for events, places, clubs, guides and rules; towns and ZIPs     | [`0005-search.md`](./specs/0005-search.md)       |

**Status (2026-10-29):** phases 0–5 are built and checked locally; every slice is ticked in its spec. The owner added search to version 1 on 2026-10-29 ("a real 1.0"). Going live is the owner's checklist: [`LAUNCH.md`](./LAUNCH.md).

**Decisions (owner, 2026-10-27):** version 1 is phases 0–4, public in Florida; profiles and builds, stored results, flying conditions and the app come after. The owner approves what `AGENTS.md` sends to Itaca engineering, and each approval is recorded in `DECISIONS.md`. Sign-in is Google or an email link, no passwords; nothing about a member is public by default. Clubs are verified by an email at their domain or a code on their website, else by the crew. Events and places cover all of Florida from day one; community and promotion start in South Florida.

The tracks below are the earlier order of work. Items that Servo 1.0 covers are mapped to its slices; the rest (discovery with Parallel, outreach) continue after launch.

## Earlier order of work (2026-10-22 and 2026-10-23)

Building no longer waits on AWS: everything runs on a laptop against the local PostgreSQL in Docker. Deploying comes last.

**New order (owner, 2026-10-23):** what people see and organisers use comes first; the engine and discovery keep growing underneath, lean rather than perfectionist (see [`LANDSCAPE.md`](./LANDSCAPE.md) for why).

### Track P — what people see and use

- [x] **P1** Events on the web (was A4): a public events API, `/events` from the database with a map and "near me", a page per event with its sources, last-checked date and schema.org `Event` data, and calendar feeds to subscribe to (all events, per discipline, per event).
- [ ] **P2** Resolve (was A3c): sightings matched to events; new ones (AeroFest) wait for the crew, then appear on the web.
- [ ] **P3** Organiser kit: claim a club or track, publish an event by pasting a link or a flyer, a calendar widget for their own site, a monthly report. Accounts and roles need Itaca engineering.
- [ ] **P4** Places with stewards, a "try it" request for newcomers, "Can I fly here?".
- [ ] **P5** Minimal crew console (was A5; needs the `crew` role: Itaca review).

### Track A — the engine underneath

- [x] **A1** Commit the dependency updates and the AWS agent rules.
- [x] **A2** Data model and Zod contracts: sources, fetches, sightings, events, event sightings, series, places, hosts, changes, reviews. Seed from `apps/app/src/content/events.ts` and `places.ts`.
- [x] **A3** Worker run from a command (`pnpm engine`): polite fetcher, ICS and JSON-LD readers, saved fixtures and Vitest tests. First live result: AeroFest and Jets Over Miami read from the AMPS site.
- [x] **A3b** Platform readers in the order the census shows they pay off (DualRates, Wix Events, Wild Apricot, WordPress events), then single sites (Extreme Flight, Horizon Hobby, ROAR, RCSignup) after checking robots.txt and terms. Done 2026-10-27 (spec 0001, slice 5): The Events Calendar, Wild Apricot, Extreme Flight and RCSignup are read; DualRates is region-blocked, Horizon Hobby (terms) and MultiGP (robots.txt) wait for permission.

### Track D — discovery, lean

Design: [`DISCOVERY.md`](./DISCOVERY.md). Good coverage of the important events and correct information matter more than finding every last one; we keep one simple estimate of what we miss.

- [ ] **D1** A sample golden set (~50 events checked by hand) to estimate coverage, instead of an exhaustive one.
- [ ] **D2** Census v1: FAA FRIA and fixed sites, ROAR, RCSignup, LiveRC, AMYA, MultiGP into `hosts` and `places`; channel probe of every website. Also feeds the map of places. FAA FRIA and fixed sites done (`pnpm census`, 2026-10-27).
- [ ] **D3** Leads pipeline with Parallel (season sweep and a few daily monitors), recording which method found each event.
- [ ] **D4** Simple comparison of Parallel against our own sources on the sample; estimate of what both miss.
- [ ] **D6** Outreach: AMA, DualRates, MultiGP, RCSignup, Google Calendar clubs.

### Track B — research (can run in its own session)

- [x] **B2** Check the new sources: FAA FRIAs, AMA club finder, results sites, club platforms (see `DISCOVERY.md`). TFRs still to check.
- [x] **B5** Landscape: what exists in RC and what other hobbies teach (see `LANDSCAPE.md`).
- [ ] **B4** AI extraction with mandatory quotes, on real flyers, once there is access to Claude (Bedrock or the API).

### Track C — the owner and Itaca engineering

- [x] **C1** Region: us-east-2, the AWS project's only region (`infra/`, Terraform since 2026-10-29).
- [ ] **C2** Worker infrastructure: queue, schedule, S3.
- [ ] **C3** Name and domain, and the Cloudflare zone.
- [ ] **C4** Discovery API keys; send Parallel the question about their terms.
- [ ] **C5** Write to AMA District V and to a Florida MultiGP chapter.
- [ ] **C6** Club Google Calendars: `calendar.google.com/robots.txt` blocks automated reading. Ask DeLand RC (and other clubs) for permission or their feed, and decide with Itaca.

### Milestones

| #   | Milestone              | Done when                                                                                                          | Depends on      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| M1  | Live calendar, locally | The worker reads the open sources and `/events` comes from the database. AeroFest appears without anyone typing it | P1, P2, A3      |
| M2  | End-to-end demo        | A source changes → the worker notices → merges → the crew sees the evidence → approves → web and ICS update        | P5, D3, B4      |
| M3  | Deployed to `dev`      | The same, on AWS, with the worker on a schedule                                                                    | C1, C2, C3      |
| M4  | Members and organisers | Follow, "going", alerts, submit with a flyer, claim a club                                                         | SES, S3, roles  |
| M5  | Beyond Florida         | Discovery at scale, public API, Expo mobile app                                                                    | Capacity review |

## Decisions taken (2026-10-22)

- **Results:** link to the official results first. Store results ourselves only when an organiser publishes them with us (they carry people's names).
- **Region:** events from all of Florida; places and community for South Florida first.
- **Community:** utility first (follow, alerts, submit, claim). Social features when there are people.
- **Start:** A1–A3 now; the golden set (B1) in a parallel session.
- **Discovery first (2026-10-22, later the same day):** after A3 the owner put discovery ahead of reading more sites: Track D, designed in `DISCOVERY.md`.
