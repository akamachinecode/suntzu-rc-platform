# engine.run — The engine reads its sources

- **Trigger:** `pnpm engine [source…]` (a schedule once deployed). With no names it reads every `active` source; a named `candidate` can be tried; `blocked` sources are never read.
- **Who:** the crew, from the command line.
- **Path:** `apps/api/src/engine.ts` → `events/engine/run.ts` → `fetcher.ts` (robots.txt with Crawl-delay and Request-rate, 2 s per site at least, conditional requests, bot walls reported) → a reader → PostgreSQL. Readers, by the source's `adapter` and `config.platform`:
  - `ics` → `ics.ts`: iCalendar feeds (Google Calendar, WordPress `?ical=1`).
  - `json-ld` → `json-ld.ts`: schema.org events in pages, alone, in `@graph` or in an `ItemList` (Wix Events, RCSignup's state pages); `followLinks` reads each event page.
  - `api` + `the-events-calendar` → `the-events-calendar.ts`: WordPress' The Events Calendar REST API (`/wp-json/tribe/events/v1/events`), page after page.
  - `api` + `wild-apricot` → `wild-apricot.ts`: a Wild Apricot site's events feed (`/events/RSS`).
  - `html` + `schedule-table` → `schedule-table.ts`: a table of date, name and town under a year heading (Extreme Flight's schedule).
- **Sources read (2026-10-27):** `rcsignup` (Florida races), `extreme-flight-schedule` (Florida rows only, `onlyPlaces`), `imperial-rc-events`, `rcacf-events`. Candidates and blocked sources, each with what its robots.txt and terms said, are in `apps/api/src/events/seed-data.ts`.
- **Data:** writes `fetches` and `sightings` (one per distinct content, with the quote behind each field); keeps raw responses in `ENGINE_SNAPSHOT_DIR`.
- **Rules:** no personal data: descriptions and organisers are never read from calendars, APIs or feeds. Notices, club business and repeating entries are skipped; so are places outside `onlyPlaces` ("elsewhere").
- **Errors:** each source's errors are listed in the run report (a bot wall shows as "answers with a DualRates region block"); one source failing doesn't stop the others.
- **Test:** `apps/api/src/events/engine/*.test.ts`, against trimmed copies of real pages in `fixtures/`.
- **Observe:** the run report printed by the command.
- **Status:** verified — 2026-10-27
