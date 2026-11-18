# follows.toggle — A member follows or unfollows something

- **Trigger:** the bell button on an event ("Follow"), club ("Follow this club") or place ("Follow this place") page; pressing "Following" stops. Or the ✕ ("Stop following …") next to each row under "What you follow" on `/me`.
- **Who:** signed-in members. For others the button is a link to `/sign-in?next=<this page>`.
- **Path:** `components/account/follow-buttons.tsx` → Server Action `setFollow` (`lib/follow-actions.ts`) → `PUT`/`DELETE /me/follows/{target}/{id}` → `MembersService.follow`. The ✕ on `/me`: Server Action `unfollow` (`me/actions.ts`) → the same `DELETE`.
- **Data:** writes `follows` (target event, host, place or discipline; by id).
- **Rules:** public slugs in, row ids stored; following twice counts once; only the caller's own follow changes. Unknown or unpublished things can't be followed (404), nor an unknown kind (400).
- **Errors:** the button keeps its previous state.
- **Test:** `e2e/follows.toggle.e2e.ts` (follow an event from its page and stop with the ✕ on `/me`, follow and stop a club and a field from their pages, twice counts once, another member can't stop someone's follow, unknown things 404 and an unknown kind 400, signed out → sign-in link and 401)
- **Observe:** API log lines with `bit: "follows.toggle"`; `follows.state` for the button's initial state.
- **Status:** verified — 2026-11-18 (end-to-end test)
