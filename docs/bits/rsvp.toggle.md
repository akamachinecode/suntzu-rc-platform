# rsvp.toggle — A member says they're going

- **Trigger:** "I'm going" on an event page; pressing "Going" takes it back. Events that are over or cancelled don't offer it.
- **Who:** signed-in members. For others the button is a link to `/sign-in?next=<this page>`.
- **Path:** `follow-buttons.tsx` → Server Action `setGoing` (`lib/follow-actions.ts`) → `PUT`/`DELETE /me/going/{slug}` → `MembersService.going`.
- **Data:** writes `rsvps`; going also follows the event, and taking it back keeps the follow.
- **Rules:** only the count is public (`GET /people/event/{slug}`, `bit: "follows.count"`), never who. Going twice counts once; only the caller's own "going" changes. The event shows under "Where you're going" on `/me`. Unknown or unpublished events → 404.
- **Errors:** the button keeps its previous state.
- **Test:** `e2e/rsvp.toggle.e2e.ts` (going from the event page also follows, shows on `/me` and in the count, and taking it back keeps the follow; an event that's over has no "I'm going"; another member can't take it back; twice counts once and an unknown event 404; signed out → sign-in link and 401)
- **Observe:** API log lines with `bit: "rsvp.toggle"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
