# me.calendar — A member's calendar app reads their private feed

- **Trigger:** a calendar app fetches `/calendar/<secret>.ics` (the link on `/me`).
- **Who:** anyone with the secret link.
- **Path:** `apps/app/src/app/calendar/[file]/route.ts` → `GET /me/calendar/{token}` → `MembersService.calendar` → `ics-writer.ts`.
- **Data:** reads `members`, `follows`, `rsvps`, `events`.
- **Rules:** followed and going events, plus upcoming events of followed clubs, places and disciplines; only announced dates.
- **Errors:** unknown token → 404.
- **Test:** none yet
- **Observe:** API log lines with `bit: "me.calendar"` (the route pattern is logged, not the token).
- **Status:** verified — 2026-10-27
