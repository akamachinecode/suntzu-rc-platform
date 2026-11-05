# events.get — A visitor opens an event's page

- **Trigger:** a visitor opens `/events/<slug>`.
- **Who:** anyone; following, going and corrections need an account.
- **Path:** `apps/app/src/app/events/[slug]/page.tsx` → `getPublicApi()` → `GET /events/{slug}` → `EventsService.get` (sources, history, other editions, counts).
- **Data:** reads one event, its place, host, series editions, `changes` (dates, status, created), sources with last-seen dates, and the number following and going.
- **Rules:** unpublished events answer 404. The page shows where each fact comes from, what changed and when, the next edition after the event, and asks "was this right?" once it's over. schema.org `Event` data only for exact dates.
- **Errors:** unknown or unpublished slug → the 404 page.
- **Test:** none yet
- **Observe:** API log lines with `bit: "events.get"`.
- **Status:** verified — 2026-10-27
