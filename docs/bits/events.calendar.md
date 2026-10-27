# events.calendar — Someone subscribes to the events calendar

- **Trigger:** a calendar app (Apple, Google, Outlook) fetches `/events/calendar.ics`, optionally filtered (`?discipline=air`).
- **Who:** anyone.
- **Path:** calendar app → `apps/app/src/app/events/calendar.ics/route.ts` (relays, cached 5 minutes) → `GET /events/calendar.ics` → `EventsService.calendar` → `ics-writer.ts`.
- **Data:** reads published events with announced dates.
- **Rules:** cancelled events stay in the feed marked CANCELLED, so subscribers find out. Feeds live on the site's own domain.
- **Errors:** the API's status code is passed through; calendar apps retry on their own schedule.
- **Test:** `apps/api/src/events/ics-writer.test.ts`.
- **Observe:** API log lines with `bit: "events.calendar"`.
- **Status:** read in code — 2026-10-27
