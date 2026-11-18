# organiser.widget — A club's website shows its SunTzu RC calendar

- **Trigger:** the club pastes the iframe code from its dashboard.
- **Who:** anyone visiting the club's site.
- **Path:** `apps/app/src/app/embed/clubs/[slug]/route.ts` (plain HTML) → `GET /hosts/{slug}`.
- **Data:** reads the club's upcoming events.
- **Rules:** the only path that other sites may frame (`next.config.ts`: `X-Frame-Options` everywhere else); cached 5 minutes. Every text and link is escaped, and the page has its own strict policy (`default-src 'none'`, inline styles only, no forms, any site may frame it), since it has no scripts (spec 0010).
- **Errors:** unknown club → 404.
- **Test:** `e2e/organiser.widget.e2e.ts` (a club's site frames it and it lists the club's new event, HTML in its name shown as text, links that open the site in a new tab; its headers: the strict policy with `frame-ancestors *`, no `X-Frame-Options`; no scripts, forms or relative links; a club page in the same frame is refused; an unknown club → 404)
- **Observe:** app server logs.
- **Status:** verified — 2026-11-18 (end-to-end test)
