# rsvp.toggle — A member says they're going

- **Trigger:** "I'm going" on an event page.
- **Who:** signed-in members.
- **Path:** `follow-buttons.tsx` → `setGoing` → `PUT`/`DELETE /me/going/{slug}` → `MembersService.going`.
- **Data:** writes `rsvps`; going also follows the event.
- **Rules:** only the count is public (`GET /people/event/{slug}`, `bit: "follows.count"`), never who.
- **Errors:** the button keeps its previous state.
- **Test:** none yet
- **Observe:** API log lines with `bit: "rsvp.toggle"`.
- **Status:** verified — 2026-10-27
