# events.event-calendar — A visitor adds one event to their calendar

- **Trigger:** "Add to calendar" on an event page downloads `/events/<slug>/calendar.ics`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/events/[slug]/calendar.ics/route.ts` → `GET /events/{slug}/calendar.ics` → `EventsService.eventCalendar` → `ics-writer.ts`.
- **Data:** reads one published event.
- **Rules:** only events with announced dates.
- **Errors:** 404 for unknown or unpublished events.
- **Test:** `apps/api/src/events/ics-writer.test.ts`.
- **Observe:** API log lines with `bit: "events.event-calendar"`.
- **Status:** read in code — 2026-10-27
