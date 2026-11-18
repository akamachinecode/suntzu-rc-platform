# crew.edit-event — The crew changes an event directly

- **Trigger:** `PATCH /crew/events/{slug}`. There's no screen for it yet: the review card's "Correct" (`crew.decide`) covers what the queue brings, this covers any event (a typo, beginners welcome, a results link, a cancellation).
- **Who:** the crew; anyone else gets 403 (401 signed out).
- **Path:** `apps/api/src/crew/crew.controller.ts` (`editEvent`, `eventPatch` from `@workspace/shared`) → `CrewService.editEvent` → `applyPatch` (`events/engine/resolve.ts`) by `crew`.
- **Data:** writes the changed fields of `events` (name, dates, date precision and text, status, links, fee, summary, sanctions, classes, beginners welcome) and one `changes` row per field that really changed, by `crew`.
- **Rules:** any field, on any event, published or not; the slug never changes, so links keep working after a rename. An event never ends before it starts: a last day before the first is dropped. Fields the request doesn't send stay as they are.
- **Errors:** an unknown event answers 404; a field that isn't valid (a link that isn't one, an unknown status) answers 400 and changes nothing.
- **Test:** `e2e/crew.edit-event.e2e.ts` (the crew renames, describes, marks beginners welcome, adds results and cancels an event, and its page shows it at the same address; a last day before the first is dropped; bad fields 400, an unknown event 404; a member 403 and a visitor 401 change nothing)
- **Observe:** API log lines with `bit: "crew.edit-event"`.
- **Status:** verified — 2026-11-18 (end-to-end test, through the API)
