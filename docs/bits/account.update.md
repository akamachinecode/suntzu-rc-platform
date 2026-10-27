# account.update — A member changes their settings

- **Trigger:** "Save" on `/me`.
- **Who:** signed-in members.
- **Path:** `me/profile-form.tsx` → Server Action `updateProfile` (`me/actions.ts`, `memberUpdate` from `@workspace/shared`) → `PATCH /me` → `MembersService.update`.
- **Data:** writes `user.name` and `members` (ZIP, distance, disciplines, change alerts, weekly digest).
- **Rules:** ZIP is 5 digits or empty; distance 5–300 miles; nothing here is ever public.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet
- **Observe:** API log lines with `bit: "account.update"`.
- **Status:** verified — 2026-10-27
