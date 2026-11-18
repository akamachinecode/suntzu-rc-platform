# places.get — A visitor opens a field's or track's page

- **Trigger:** `/places/<slug>`.
- **Who:** anyone; following needs an account.
- **Path:** `apps/app/src/app/(site)/places/[slug]/page.tsx` → `GET /places/{slug}` → `PlacesService.place`.
- **Data:** reads the place, its host, its upcoming events, how many follow it and whether a verified organiser keeps it.
- **Rules:** how to visit comes from `access` (default "ask first"); the source (FAA record or crew) and the last-checked date are shown; FRIAs say Remote ID isn't needed there. schema.org `SportsActivityLocation`. The page's map (MapLibre and its tiles) loads only when it comes within 200 px of the screen, so a phone that never scrolls there doesn't download it; the connection to the tile server opens early (spec 0010).
- **Errors:** unknown slug → the 404 page, `noindex`. Its HTTP status is 200: the page streams behind its loading screen (`places/loading.tsx`, spec 0010), so the status is sent before the API says there's no such item, and Next.js marks the page `noindex` instead (Next.js, `loading.md`, "Status codes"; kept on purpose, `docs/DECISIONS.md`, 2026-11-18). The API answers 404. A browser that can't draw maps (no WebGL2) sees a note in the map's place and the rest of the page as usual (`components/map-unavailable.tsx`, spec 0010); before, the whole page broke.
- **Test:** `e2e/places.get.e2e.ts` (a club's FRIA field: address, "Run by" its club, its new event, "No Remote ID needed here", the claim link and schema.org data; a track nobody runs: ask first, no FRIA, "Tell us", directions; an unknown slug → the 404 page, `noindex`, and the API answers 404)
- **Observe:** API log lines with `bit: "places.get"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
