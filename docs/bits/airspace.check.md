# airspace.check — Someone asks "Can I fly here?"

- **Trigger:** a tap on the map or "Check where I am" on `/places/can-i-fly-here`.
- **Who:** anyone.
- **Path:** `places/can-i-fly-here/checker.tsx` → Server Action `checkPoint` → `GET /airspace/check?lat&lng` → `AirspaceService.check` (`apps/api/src/places/airspace.service.ts`, point-in-polygon from the census geometry).
- **Data:** reads `airspace`, `airports` and `places`; stores nothing.
- **Rules:** controlled when inside class B, C, D or E airspace that starts at or below 400 ft; near an airport within 5 miles (1 mile for heliports and seaplane bases); at a FRIA within a quarter mile of its centre. Guidance only, with links to B4UFLY and LAANC; temporary flight restrictions aren't included yet.
- **Errors:** outside Florida → a message; API failure → "try again".
- **Test:** none yet
- **Observe:** API log lines with `bit: "airspace.check"`: the route only, never the point.
- **Status:** verified — 2026-10-27
