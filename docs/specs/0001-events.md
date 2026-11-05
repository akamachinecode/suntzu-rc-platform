# 0001 — Events that keep themselves current

- **Status:** Approved 2026-10-27 · Done 2026-10-28 (locally; deploy in spec 0004)
- **Requested by:** the owner (Alejandro), 2026-10-27
- **Approved by:** the owner, 2026-10-27 ("accept your five recommendations")

## Problem

RC pilots and racers in Florida find events in a dozen places (club sites, Facebook groups, AMA, RCSignup) and often find out about a change or a cancellation on the day. SunTzu RC already shows events from its database, but someone has to type them: the engine reads sources and stores what they say, and nothing turns that into published events.

## Goals

- The engine keeps the calendar current on its own: new editions, date changes and cancellations reach the web without anyone typing them, and the crew only sees what needs a person.
- Every event page stays useful for its whole life: what changed and when, the next edition, results afterwards.
- Anyone can find "what's on near me this weekend" in seconds, in a list, a month view or a map.
- Each event shared on social media looks like SunTzu RC (a pit-pass image).

## Out of scope

- Storing results ourselves (we link to the official results; see `DECISIONS.md`, 2026-10-22).
- Facebook groups and Google Calendar feeds without permission (robots.txt; see C6 in `ROADMAP.md`).
- Registration and payment for events: we link to the organiser's or RCSignup's entry page.

## User stories

- As a pilot, I want to see every event near me this weekend so I can decide where to go.
- As a pilot, I want to know when an event I'm interested in moves or is cancelled, before I load the truck.
- As a racer, I want to filter by discipline, sanctioning body and class.
- As a newcomer, I want to find events that welcome beginners.
- As a crew member, I want to approve, merge, correct or reject what the engine isn't sure about, with the source text next to each field.
- As an organiser, I want my event's page to look good when I share it.

## Capabilities touched

- **Data:** new tables `feedback` (anonymous "was this right?"); new event fields `beginner_friendly`; a `role` on users for the crew.
- **Identity:** a `crew` role (owner approved, 2026-10-27).
- **Processes:** the engine and resolve run from a command now and on a schedule once deployed (spec 0004).
- **AI:** none in this spec (flyer extraction is in 0003).
- **Operations:** the engine logs one report per run; the crew console shows the queue size.

## Bits

- New: `engine.resolve` — sightings become events, duplicates merge, changes are applied or queued.
- New: `crew.queue`, `crew.decide` — the crew reviews and decides.
- New: `events.feedback` — "was this right?" after an event.
- New: `events.share-image` — the pit-pass image for social media.
- Changed: `events.list` (search, weekend, beginner and sanction filters), `events.get` (changes, next edition).

## Acceptance criteria

- When the engine reads an event that matches a published one (same series, host or place, dates within three days, similar name), then the sighting is linked to it and no duplicate appears.
- When the organiser's own source moves the date or cancels the event, then the event changes on the web at the next run, the change appears in the event's history, and the change is ready for alerts (spec 0003).
- When a source the crew doesn't fully trust says something different, then the change waits in the crew's queue with both texts side by side.
- When a new event appears on the organiser's own site, or two sources agree on it, then it is published; otherwise it waits for the crew.
- When an event's last day has passed, then it shows as held, and its series shows the next edition as expected.
- When a crew member opens `/crew`, then they see the open reviews, each with the source's exact words and a link to the page, and can approve, correct, merge or reject it.
- When someone opens `/events`, then they can search by name, place or club, filter by discipline, kind, beginner-friendly and sanctioning body, switch between list, month and map, and see "this weekend".
- When an event page is shared, then the preview shows a SunTzu RC pit-pass image with the name, dates and place.
- When an event has ended, then its page asks "Was this information right?" and the answer reaches the crew.

## Slices

- [x] 1. Resolve: match, merge, publish, apply or queue changes, held and expected editions; `pnpm engine` runs it after reading (blocked by: —)
- [x] 2. Crew role and console `/crew`: queue with evidence, approve, correct, merge, reject (blocked by: 1)
- [x] 3. The living event page: history of changes, next edition, results link, "was this right?", pit-pass share image (blocked by: 1)
- [x] 4. Finding: search, weekend, beginner and sanction filters, month view (blocked by: —)
- [x] 5. More readers: the club platforms and single sites that pay off (DualRates, Wix, Wild Apricot, WordPress events), each after checking robots.txt and terms (blocked by: 1). Done 2026-10-27: The Events Calendar, Wild Apricot and schedule-table readers, RCSignup through JSON-LD; DualRates waits on its region block, Horizon and MultiGP on permission (`DECISIONS.md`)

## Open questions

- Which club calendars we may read with permission (DeLand RC and other Google Calendar clubs) — who should answer: the owner, writing to the clubs (C6).
- Whether Parallel's terms let us keep lead URLs (discovery, `DISCOVERY.md`) — who should answer: the owner, writing to Parallel (C4).

## Needs Itaca engineering

- The `crew` role: approved by the owner acting as Itaca engineering, 2026-10-27 (recorded in `DECISIONS.md`).
