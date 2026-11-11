# events.list — A visitor finds events

- **Trigger:** a visitor opens `/events` (optionally `?discipline=air`, `?kind=race`, `?when=weekend`, `?beginners=1`, `?q=jets`) or the home page.
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/page.tsx` → `getPublicApi()` → `GET /events` → `EventsService.list` → `EventsExplorer` (search, discipline, kind, this weekend, beginners welcome, sanctioning body, near me, map, list or month view in `month-view.tsx`). On a phone the filters sit behind one "Filters" button (`components/filters/filter-sheet.tsx`) and the map is a view of its own (List · Map · Month), loaded only when it is opened.
- **Data:** reads published `events` with their `places` and `hosts`.
- **Rules:** from today on; filters and search run in the browser on the list the API returned. "This weekend" is Friday to Sunday in Florida (`weekendRange`). "Near me" sorts in the browser: the location is never sent anywhere. Cached 5 minutes.
- **Errors:** if the API is down the page says "The calendar is taking a break".
- **Test:** none yet
- **Observe:** API log lines with `bit: "events.list"`.
- **Status:** verified — 2026-11-11 (phone filters and map view, in Chromium at 390 px)
