# events.calendar — Someone subscribes to the events calendar

- **Trigger:** a calendar app (Apple, Google, Outlook) fetches `/events/calendar.ics`, optionally filtered (`?discipline=air`).
- **Who:** anyone.
- **Path:** calendar app → `apps/app/src/app/(site)/events/calendar.ics/route.ts` (relays, cached 5 minutes) → `GET /events/calendar.ics` → `EventsService.calendar` → `ics-writer.ts`.
- **Data:** reads published events with announced dates.
- **Rules:** cancelled events stay in the feed marked CANCELLED, so subscribers find out. Feeds live on the site's own domain. The relay keeps each feed (each address with its filters) for 5 minutes, so a new or changed event can take that long to reach subscribers.
- **Errors:** the API's status code is passed through; calendar apps retry on their own schedule.
- **Test:** `e2e/events.calendar.e2e.ts` (the subscribe links on /events, for everything or one discipline, reach the site's own feed; the feed has upcoming events with announced dates, keeps cancelled ones marked CANCELLED, leaves out past and month-only ones and filters by discipline; a filter the API refuses answers 400 here too); the file format is unit-tested in apps/api/src/events/ics-writer.test.ts
- **Observe:** API log lines with `bit: "events.calendar"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
