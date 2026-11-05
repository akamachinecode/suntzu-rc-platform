# hosts.get — A visitor opens a club's or track's page

- **Trigger:** `/clubs/<slug>` (the list at `/clubs`, `bit: "hosts.list"`).
- **Who:** anyone.
- **Path:** `apps/app/src/app/clubs/[slug]/page.tsx` → `GET /hosts/{slug}` → `PlacesService.host`; its calendar feed at `/clubs/<slug>/calendar.ics` relays `GET /events/calendar.ics?host=<slug>`.
- **Data:** reads the host, its places, its upcoming events and how many follow it.
- **Rules:** "Verified" when one of its organisers proved it; "welcomes newcomers" links to `/try`.
- **Errors:** unknown slug → 404.
- **Test:** none yet
- **Observe:** API log lines with `bit: "hosts.get"`.
- **Status:** verified — 2026-10-27
