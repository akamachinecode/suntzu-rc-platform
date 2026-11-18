# hosts.get — A visitor opens a club's or track's page

- **Trigger:** `/clubs/<slug>` (the list at `/clubs`, `bit: "hosts.list"`).
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/clubs/[slug]/page.tsx` → `GET /hosts/{slug}` → `PlacesService.host`; its calendar feed at `/clubs/<slug>/calendar.ics` relays `GET /events/calendar.ics?host=<slug>`.
- **Data:** reads the host, its places, its upcoming events and how many follow it.
- **Rules:** "Verified" when one of its organisers proved it; "welcomes newcomers" links to `/try`.
- **Errors:** unknown slug → the 404 page, `noindex`. Its HTTP status is 200, not 404 (a soft 404): `clubs/loading.tsx` starts the response before the page can call `notFound()`; found by the end-to-end test, 2026-11-18. The calendar feed answers 404 for a slug that isn't one.
- **Test:** `e2e/hosts.get.e2e.ts` (a club's page: its new event, its field, website, follow and claim links, schema.org data, its calendar feed on the site's domain and the event in the API's feed; another club's event isn't there; an unknown slug → the 404 page, `noindex` and status 404, which fails for now)
- **Observe:** API log lines with `bit: "hosts.get"`.
- **Status:** verified — 2026-11-18 (end-to-end test), except the 404 status: broken, see Errors
