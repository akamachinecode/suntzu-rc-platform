# places.list — The events map gets its places

- **Trigger:** `/events` loads.
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/page.tsx` → `getPublicApi()` → `GET /places` → `EventsService.places`.
- **Data:** reads `places` (name, kind, coordinates).
- **Rules:** public catalogue; cached 5 minutes.
- **Errors:** without places the map shows no pins; the list still works.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "places.list"`.
- **Status:** read in code — 2026-10-27
