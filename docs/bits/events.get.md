# events.get — A visitor opens an event's page

- **Trigger:** a visitor opens `/events/<slug>`.
- **Who:** anyone; following, going and corrections need an account.
- **Path:** `apps/app/src/app/events/[slug]/page.tsx` → `getPublicApi()` → `GET /events/{slug}` → `EventsService.get` (sources, history, other editions, counts).
- **Data:** reads one event, its place, host, series editions, `changes` (dates, status, created), sources with last-seen dates, and the number following and going.
- **Rules:** unpublished events answer 404. The page shows where each fact comes from, what changed and when, the next edition after the event, and asks "was this right?" once it's over. "Over" means its last day has ended where it happens (`dateIn(event.timezone)` in `apps/app/src/lib/events.ts`; the Panhandle is on Central time), not at midnight UTC (spec 0010). schema.org `Event` data only for exact dates.
- **Errors:** unknown or unpublished slug → the 404 page. A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** `apps/app/src/lib/events.test.ts` (the date where the event happens)
- **Observe:** API log lines with `bit: "events.get"`.
- **Status:** verified — 2026-10-27; time zone read in code and tested — 2026-11-17
