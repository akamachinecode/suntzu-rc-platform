# organiser.widget — A club's website shows its SunTzu RC calendar

- **Trigger:** the club pastes the iframe code from its dashboard.
- **Who:** anyone visiting the club's site.
- **Path:** `apps/app/src/app/embed/clubs/[slug]/route.ts` (plain HTML) → `GET /hosts/{slug}`.
- **Data:** reads the club's upcoming events.
- **Rules:** the only path that other sites may frame (`next.config.ts`: `X-Frame-Options` everywhere else); cached 5 minutes.
- **Errors:** unknown club → 404.
- **Test:** none yet
- **Observe:** app server logs.
- **Status:** verified — 2026-10-27
