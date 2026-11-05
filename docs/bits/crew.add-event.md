# crew.add-event — The crew adds an event by hand

- **Trigger:** "Publish event" in "Add an event" on `/crew`.
- **Who:** the crew.
- **Path:** `crew/add-event-form.tsx` → `addEvent` → `POST /crew/events` (`manualEvent`) → `publishManual` (`apps/api/src/events/manual.ts`).
- **Data:** writes `events` (published), a `sightings` row from the `servo-crew` source linked to it, `changes`, and a `series` for yearly kinds.
- **Rules:** published at once; when the engine later reads the same event on the web, resolve links it here.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet
- **Observe:** API log lines with `bit: "crew.add-event"`.
- **Status:** read in code — 2026-10-27
