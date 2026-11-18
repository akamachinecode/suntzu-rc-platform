# events.share-image — An event's page is shared

- **Trigger:** a social network or chat app reads the page's `og:image` (and `twitter:image`) and fetches it: `/events/<slug>/opengraph-image-<id>?<hash>`, an address Next.js makes. Their bots get these tags in the page's `<head>`; browsers get them later in the page (streamed metadata).
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/events/[slug]/opengraph-image.tsx` (next/og) → `GET /events/{slug}` → a 1200×630 pit pass with name, dates, place, kind and discipline in Archivo (`lib/og-font.ts`, Google Fonts).
- **Data:** reads the published event.
- **Rules:** cancelled events show it; without the font (offline) the default font is used.
- **Errors:** an unknown event draws a generic SunTzu RC pass.
- **Test:** `e2e/events.share-image.e2e.ts` (a link-preview bot finds the 1200×630 PNG in the page's `<head>`, drawn the same every time and differently for another event; a cancelled edition's pass differs from the running one; an unknown event gets the generic pass)
- **Observe:** app server logs.
- **Status:** verified — 2026-11-18 (end-to-end test)
