# events.list — A visitor browses upcoming events

- **Trigger:** a visitor opens `/events` or the home page (three upcoming events).
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/page.tsx` (and `app/page.tsx`) → `getPublicApi()` → `GET /events` → `EventsController.list` → `ZodPipe(eventListQuery)` → `EventsService.list` → PostgreSQL → `EventsExplorer` (list, filters, map, "Near me").
- **Data:** reads published `events` with their `places` and `hosts`.
- **Rules:** only published events, from today on unless `from` is given; filters by discipline, kind and region. "Near me" sorts in the browser: the location is never sent anywhere. Responses are cached 5 minutes.
- **Errors:** if the API is down the page says "The calendar is taking a break".
- **Test:** none yet.
- **Observe:** API log lines with `bit: "events.list"`.
- **Status:** read in code — 2026-10-27
