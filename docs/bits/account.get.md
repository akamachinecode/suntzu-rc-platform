# account.get — A member opens My Servo

- **Trigger:** a signed-in member opens `/me` (private, `proxy.ts`).
- **Who:** signed-in members.
- **Path:** `apps/app/src/app/me/page.tsx` → `getApi()` → `GET /me` and `GET /me/following` → `MembersService.profile` / `.following` (`apps/api/src/members/`).
- **Data:** reads `user`, `members` (created on first visit with secret calendar and email tokens), `follows`, `rsvps`, `host_members`.
- **Rules:** scoped to the caller. The private calendar URL is shown only to its owner.
- **Errors:** without a session → `/sign-in?next=/me`.
- **Test:** none yet
- **Observe:** API log lines with `bit: "account.get"`.
- **Status:** verified — 2026-10-27
