# airspace.check — Someone asks "Can I fly here?"

- **Trigger:** a tap on the map or "Check where I am" on `/places/can-i-fly-here`, or a link to `/places/can-i-fly-here?at=<lat>,<lng>` (search's "Can I fly near …?"), checked on arrival.
- **Who:** anyone.
- **Path:** `places/can-i-fly-here/checker.tsx` → Server Action `checkPoint` → `GET /airspace/check?lat&lng` → `AirspaceService.check` (`apps/api/src/places/airspace.service.ts`, point-in-polygon from the census geometry).
- **Data:** reads `airspace`, `airports` and `places`; stores nothing.
- **Rules:** controlled when inside class B, C, D or E airspace that starts at or below 400 ft; near an airport within 5 miles (1 mile for heliports and seaplane bases); at a FRIA within a quarter mile of its centre. Guidance only, with links to B4UFLY and LAANC; temporary flight restrictions aren't included yet.
- **Errors:** outside Florida → a message; API failure → "try again". A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** `e2e/airspace.check.e2e.ts` ("Check where I am" at a FRIA field and outside Florida, a spot from a link, and through the API the quarter-mile FRIA rule, `no-store` and Florida's edges); the controlled and near-an-airport answers need the census's airspace and airports, which the tests' database doesn't load: their geometry is unit-tested in apps/api/src/places/census/geometry.test.ts and airspace.test.ts
- **Observe:** API log lines with `bit: "airspace.check"`: the route only, never the point. Traces show `lat=[redacted]&lng=[redacted]` (`ScrubUrls`, spec 0010), and the Collector drops the query too.
- **Status:** verified — 2026-11-18 (end-to-end test; the controlled and near-an-airport answers by unit tests only)
