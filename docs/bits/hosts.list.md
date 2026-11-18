# hosts.list — A visitor browses every club and track

- **Trigger:** a visitor opens `/clubs` ("Clubs and tracks" on `/places`, the sitemap).
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/clubs/page.tsx` → `getPublicApi()` → `GET /hosts` (`apps/api/src/places/places.controller.ts`) → `PlacesService.hosts` (`apps/api/src/places/places.service.ts`) → one card per host, grouped by county. The sitemap (`apps/app/src/app/sitemap.ts`) reads the same list for the clubs' pages.
- **Data:** reads every `hosts` row (clubs, tracks, shops, sanctioning bodies and organisers), A to Z; writes nothing.
- **Rules:** grouped by county ("Broward County"), counties A to Z, and those without one last under "Across Florida". Each card shows the kind and the town, leads to the club's page (`hosts.get`) and says "Verified on SunTzu RC" once one of its organisers proved it (`hosts.verify`). Public and read only; the API answers with `Cache-Control: public, max-age=300`.
- **Errors:** if the API doesn't answer, the page says "The list is taking a break. Try again in a minute." While it loads, `clubs/loading.tsx` shows the loading screen.
- **Test:** `e2e/hosts.list.e2e.ts` (from "Clubs and tracks" on /places: every host the API has, with its kind, town, link and "Verified" badge, under its county's heading, "Across Florida" last; a card leads to the club's page; `GET /hosts` answers anyone)
- **Observe:** API log lines with `bit: "hosts.list"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
