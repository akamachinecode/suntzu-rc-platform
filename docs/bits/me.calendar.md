# me.calendar — A member's calendar app reads their private feed

- **Trigger:** a calendar app fetches `/calendar/<secret>.ics` (the "Apple or Outlook", "Google Calendar" and "Copy link" buttons under "Your own calendar" on `/me`).
- **Who:** anyone with the secret link; no sign-in (calendar apps can't).
- **Path:** `apps/app/src/app/calendar/[file]/route.ts` (refuses names that aren't `<20–64 characters>.ics` with 404) → `GET /me/calendar/{token}` → `MembersService.calendar` → `ics-writer.ts`.
- **Data:** reads `members`, `follows`, `rsvps`, `events`.
- **Rules:** followed and going events, plus upcoming events of followed clubs, places and disciplines; only announced dates (day precision) and events not over yet. Each link only ever shows its own member's calendar.
- **Errors:** unknown token, including a deleted account's → 404, no calendar.
- **Test:** `e2e/me.calendar.e2e.ts` (the link on `/me` gives followed, going and followed-discipline events and leaves out the rest, the ones that are over and the ones without an announced day; each member's link shows only their own; made-up, malformed and deleted-account links get 404). Followed clubs and places use the same query as disciplines and aren't tested separately, so the seeded clubs stay untouched.
- **Observe:** API log lines with `bit: "me.calendar"` (the route pattern is logged, not the token). Traces show `/calendar/[secret].ics` (`ScrubUrls` in the app and the API, spec 0010); before 2026-11-17 the secret reached CloudWatch in span URLs.
- **Status:** verified — 2026-11-18 (end-to-end test)
