# events.list — A visitor finds events

- **Trigger:** a visitor opens `/events` (optionally `?discipline=air`, `?kind=race`, `?when=weekend`, `?beginners=1`, `?q=jets`) or the home page.
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/events/page.tsx` → `getPublicApi()` → `GET /events` → `EventsService.list` → `EventsExplorer` (search, discipline, kind, this weekend, beginners welcome, sanctioning body, near me, map, list or month view in `month-view.tsx`). On a phone the filters sit behind one "Filters" button (`components/filters/filter-sheet.tsx`) and the map is a view of its own (List · Map · Month), loaded only when it is opened.
- **Data:** reads published `events` with their `places` and `hosts`.
- **Rules:** from today on; filters and search run in the browser on the list the API returned. "This weekend" is Friday to Sunday in Florida (`weekendRange`). "Near me" sorts in the browser: the location is never sent anywhere. Cached 5 minutes. "Near me" says, next to the button, that it asks the browser once and the location stays on the device; distances are worked out in the browser (spec 0010).
- **Errors:** if the API is down the page says "The calendar is taking a break". A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** `e2e/events.list.e2e.ts` (a new event is listed and the search field finds it, past ones aren't; discipline, kind and beginners welcome from the buttons and from the address; this weekend in Florida; near me sorts the closest first and sends the location to neither the site nor the API)
- **Observe:** API log lines with `bit: "events.list"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
