# follows.toggle — A member follows or unfollows something

- **Trigger:** the bell button on an event, club or place page, or the ✕ on `/me`.
- **Who:** signed-in members (others are sent to sign in).
- **Path:** `components/account/follow-buttons.tsx` → Server Actions in `lib/follow-actions.ts` → `PUT`/`DELETE /me/follows/{target}/{id}` → `MembersService.follow`.
- **Data:** writes `follows` (target event, host, place or discipline; by id).
- **Rules:** public slugs in, row ids stored; unpublished events can't be followed (404).
- **Errors:** the button keeps its previous state.
- **Test:** none yet
- **Observe:** API log lines with `bit: "follows.toggle"`; `follows.state` for the button's initial state.
- **Status:** verified — 2026-10-27
