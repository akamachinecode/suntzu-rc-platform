# events.event-calendar — A visitor adds one event to their calendar

- **Trigger:** "Add to calendar" on an event page downloads `/events/<slug>/calendar.ics`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/events/[slug]/calendar.ics/route.ts` → `GET /events/{slug}/calendar.ics` → `EventsService.eventCalendar` → `ics-writer.ts`.
- **Data:** reads one published event.
- **Rules:** only events with announced dates.
- **Errors:** 404 for unknown or unpublished events.
- **Test:** `e2e/events.event-calendar.e2e.ts` ("Add to calendar" downloads `<slug>.ics` with the days, the end the day after the last, the place and the page; no file for an event known only by its month, or for an unknown one); the file format is unit-tested in apps/api/src/events/ics-writer.test.ts
- **Observe:** API log lines with `bit: "events.event-calendar"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
