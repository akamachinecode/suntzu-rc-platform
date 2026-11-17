# places.list — A visitor browses every field and track

- **Trigger:** `/places` (and the small dots on the events map).
- **Who:** anyone.
- **Path:** `apps/app/src/app/places/page.tsx` → `getPublicApi()` → `GET /places` → `EventsService.places` → `PlacesExplorer` (search, kind, discipline, FRIA, near me) and `PlacesMap`. On a phone the filters sit behind one "Filters" button and the map is a view of its own (List · Map), loaded only when it is opened.
- **Data:** reads `places` with their hosts (about 190 in Florida after the census).
- **Rules:** near me is computed in the browser; nothing about the visitor is sent. Cached 5 minutes. "Near me" says, next to the button, that it asks the browser once and the location stays on the device; distances are worked out in the browser (spec 0010).
- **Errors:** "The map is taking a break". A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** none yet
- **Observe:** API log lines with `bit: "places.list"`.
- **Status:** verified — 2026-11-11 (phone filters and map view, in Chromium at 390 px)
