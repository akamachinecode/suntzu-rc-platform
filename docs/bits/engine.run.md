# engine.run — The engine reads its sources

- **Trigger:** `pnpm engine [source…]` (a schedule once deployed).
- **Who:** the crew, from the command line.
- **Path:** `apps/api/src/engine.ts` → `events/engine/run.ts` → `fetcher.ts` (robots.txt, 2 s per site, conditional requests) → `ics.ts` / `json-ld.ts` → PostgreSQL.
- **Data:** writes `fetches` and `sightings` (one per distinct content, with the quote behind each field); keeps raw responses in `ENGINE_SNAPSHOT_DIR`.
- **Rules:** no personal data from calendars; notices, club business and repeating entries are skipped.
- **Errors:** each source's errors are listed in the run report; one source failing doesn't stop the others.
- **Test:** `apps/api/src/events/engine/*.test.ts`.
- **Observe:** the run report printed by the command.
- **Status:** read in code — 2026-10-27
