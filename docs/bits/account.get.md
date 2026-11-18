# account.get — A member opens My SunTzu RC

- **Trigger:** a signed-in member opens `/me` (private, `proxy.ts`).
- **Who:** signed-in members.
- **Path:** `apps/app/src/app/(app)/me/page.tsx` → `getApi()` → `GET /me` → `MembersController.me` → `MembersService.profile` (`apps/api/src/members/`). The same page asks `GET /me/following` for its lists (`follows.list`).
- **Data:** reads `user`, `members` (created on the first visit, with the secret calendar and email tokens and the default settings) and `host_members`.
- **Rules:** scoped to the caller. The page greets them by name ("Hi, Robin.") or says "My SunTzu RC", shows "Signed in as <email>", and their private calendar link ("Your own calendar"), shown only to its owner. The crew also gets a "Crew console" button.
- **Errors:** without a session → `/sign-in?next=/me` (the API answers 401).
- **Test:** `e2e/account.get.e2e.ts` (a new member's empty page with their own calendar link, another member sees only their own page and link, the crew's console button, signed out → sign-in and 401)
- **Observe:** API log lines with `bit: "account.get"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
