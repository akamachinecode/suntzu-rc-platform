# places.get — A visitor opens a field's or track's page

- **Trigger:** `/places/<slug>`.
- **Who:** anyone; following needs an account.
- **Path:** `apps/app/src/app/places/[slug]/page.tsx` → `GET /places/{slug}` → `PlacesService.place`.
- **Data:** reads the place, its host, its upcoming events, how many follow it and whether a verified organiser keeps it.
- **Rules:** how to visit comes from `access` (default "ask first"); the source (FAA record or crew) and the last-checked date are shown; FRIAs say Remote ID isn't needed there. schema.org `SportsActivityLocation`.
- **Errors:** unknown slug → 404.
- **Test:** none yet
- **Observe:** API log lines with `bit: "places.get"`.
- **Status:** verified — 2026-10-27
