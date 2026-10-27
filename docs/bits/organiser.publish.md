# organiser.publish — An organiser publishes or changes an event

- **Trigger:** "Publish event" or the quick changes (beginners welcome, cancel, results link) on `/organise/<club>`.
- **Who:** the club's verified organisers.
- **Path:** `organise/[host]/page.tsx` → `publishEvent` / `quickEdit` → `POST /organise/{host}/events`, `PATCH /organise/{host}/events/{slug}` → `publishManual` with the club's own `organiser-<club>` source, or `applyPatch` by `organiser`.
- **Data:** writes `events`, `sightings`, `event_sightings`, `changes`, `series`; the dashboard reads followers and going per event (`bit: "organiser.dashboard"`).
- **Rules:** published at once with organiser trust; organisers change only their own club's events; changes reach followers' alerts.
- **Errors:** 403 for anyone else.
- **Test:** none yet
- **Observe:** API log lines with `bit: "organiser.publish"`.
- **Status:** verified — 2026-10-27
