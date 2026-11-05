# events.share-image — An event's page is shared

- **Trigger:** a social network or chat app fetches the page's preview image (`/events/<slug>/opengraph-image`).
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/[slug]/opengraph-image.tsx` (next/og) → `GET /events/{slug}` → a 1200×630 pit pass with name, dates, place, kind and discipline in Archivo (`lib/og-font.ts`, Google Fonts).
- **Data:** reads the published event.
- **Rules:** cancelled events show it; without the font (offline) the default font is used.
- **Errors:** an unknown event draws a generic SunTzu RC pass.
- **Test:** none yet
- **Observe:** app server logs.
- **Status:** verified — 2026-10-27
