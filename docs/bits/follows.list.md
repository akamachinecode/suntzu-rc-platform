# follows.list — A member sees what they follow and where they're going

- **Trigger:** a signed-in member opens `/me` (together with `account.get`).
- **Who:** signed-in members, each only their own.
- **Path:** `apps/app/src/app/(app)/me/page.tsx` → `getApi()` → `GET /me/following` → `MembersController.following` → `MembersService.following` (`apps/api/src/members/`). The page shows it in "Where you're going" (event cards) and "What you follow" (one row per thing, with the ✕ that stops following it, `follows.toggle`).
- **Data:** reads the caller's `follows` and `rsvps`, and the `events` (with their place and host), `hosts` and `places` they point to.
- **Rules:** scoped to the caller. Events only while published and not over (last day today or later, Florida time), soonest first. Going also follows, so an event the member goes to is in both lists. A discipline is listed by its label ("Helicopters") as "Every event".
- **Errors:** signed out, the API answers 401 and `/me` asks to sign in. If only this call fails, both lists say "Nothing yet".
- **Test:** `e2e/follows.list.e2e.ts` (an event, a club, a place, a discipline and an event they go to are each listed in the right place, events that are over drop off, another member sees none of it, signed out 401)
- **Observe:** API log lines with `bit: "follows.list"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
