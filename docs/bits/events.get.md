# events.get — A visitor opens an event's page

- **Trigger:** a visitor opens `/events/<slug>`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/[slug]/page.tsx` → `getPublicApi()` → `GET /events/{slug}` → `EventsController.get` → `EventsService.get` → PostgreSQL.
- **Data:** reads one event, its place, host, series and every source that mentions it, with the last-checked date.
- **Rules:** unpublished events answer 404. The page shows where each fact comes from and adds schema.org `Event` data only when the dates are exact.
- **Errors:** unknown or unpublished slug → the 404 page.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "events.get"`.
- **Status:** read in code — 2026-10-27
