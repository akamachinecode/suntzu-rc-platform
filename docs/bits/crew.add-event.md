# crew.add-event — The crew adds an event by hand

- **Trigger:** "Publish event" in "Add an event" on `/crew`.
- **Who:** the crew; anyone else gets 403 (401 signed out).
- **Path:** `crew/add-event-form.tsx` → `addEvent` (`crew/actions.ts`) → `POST /crew/events` (`manualEvent`) → `publishManual` (`apps/api/src/events/manual.ts`).
- **Data:** writes `events` (published, status `announced`), a `sightings` row from the `servo-crew` source linked to it, `changes`, and a `series` for yearly kinds (fly-ins, competitions, shows, swap meets).
- **Rules:** published at once, with a link to see it; when the engine later reads the same event on the web, resolve links it here. The crew can name the club in the API (`host`); the form has no field for it, so a place on SunTzu RC brings its club.
- **Errors:** the browser stops an empty name or date, or a link that isn't one, before sending (the form doesn't use `noValidate`). What only the server checks (a last day before the first) shows a message next to the field; after an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** `e2e/crew.add-event.e2e.ts` (the crew publishes from the form and the public page shows it at once; a last day before the first is said at the field, focused, what was typed kept, then it publishes; a member 403 and a visitor 401 publish nothing); the `manualEvent` rules are property-tested in packages/shared/src/rules.test.ts
- **Observe:** API log lines with `bit: "crew.add-event"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
