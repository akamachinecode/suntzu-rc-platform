# follows.state — A page's buttons show whether the member follows it

- **Trigger:** an event, club or place page opens. Its "Follow" (and, for events, "I'm going") buttons ask for the visitor's own state once the page has loaded, because the page itself is the same for everyone.
- **Who:** signed-in members. For anyone else the API answers 401 and the buttons become links to sign in.
- **Path:** `apps/app/src/components/account/follow-buttons.tsx` (`useEffect`) → Server Action `viewerState` (`apps/app/src/lib/follow-actions.ts`) → `getApi()` → `GET /me/state/{target}/{id}` → `MembersController.state` → `MembersService.state` (`apps/api/src/members/`).
- **Data:** reads the caller's rows in `follows` and, for events, `rsvps`.
- **Rules:** answers `{ following, going }` for the caller only, never anyone else's; `going` is always false for clubs, places and disciplines. The target is a public slug (or a discipline's name: air, rotor, ground, fpv); unknown or unpublished → 404, an unknown kind (`club`) → 400.
- **Errors:** signed out (401) → the buttons link to `/sign-in?next=<this page>`. Any other failure shows "not following". While the answer is on its way the buttons are disabled.
- **Test:** `e2e/follows.state.e2e.ts` (the buttons show "Following" and "Going" when the page opens, another member sees their own state, the API answers for the caller only, unknown things 404 and an unknown kind 400, signed out 401 and the buttons link to sign in)
- **Observe:** API log lines with `bit: "follows.state"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
