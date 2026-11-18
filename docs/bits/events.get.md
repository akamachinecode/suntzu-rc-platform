# events.get — A visitor opens an event's page

- **Trigger:** a visitor opens `/events/<slug>`.
- **Who:** anyone; following, going and corrections need an account.
- **Path:** `apps/app/src/app/(site)/events/[slug]/page.tsx` → `getPublicApi()` → `GET /events/{slug}` → `EventsService.get` (sources, history, other editions, counts).
- **Data:** reads one event, its place, host, series editions, `changes` (dates, status, created), sources with last-seen dates, and the number following and going.
- **Rules:** unpublished events answer 404. The page shows where each fact comes from, what changed and when, the next edition after the event, and asks "was this right?" once it's over. "Over" means its last day has ended where it happens (`dateIn(event.timezone)` in `apps/app/src/lib/events.ts`; the Panhandle is on Central time), not at midnight UTC (spec 0010). schema.org `Event` data only for exact dates. The page's map (MapLibre and its tiles) loads only when it comes within 200 px of the screen, so a phone that never scrolls there doesn't download it; the connection to the tile server opens early (spec 0010).
- **Errors:** unknown or unpublished slug → the 404 page, `noindex`. Its HTTP status is 200: the page streams behind its loading screen (`events/loading.tsx`, spec 0010), so the status is sent before the API says there's no such item, and Next.js marks the page `noindex` instead (Next.js, `loading.md`, "Status codes"; kept on purpose, `docs/DECISIONS.md`, 2026-11-18). The API answers 404. A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** `e2e/events.get.e2e.ts` (what, when, where, host, organiser's page, sources and schema.org data; a cancelled event; over once its last day ends in Florida, then "was this right?" and the next edition; an unknown slug → the 404 page, `noindex`, and the API answers 404); the date where the event happens is unit-tested in apps/app/src/lib/events.test.ts
- **Observe:** API log lines with `bit: "events.get"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
