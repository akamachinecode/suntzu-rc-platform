# account.update — A member changes their settings

- **Trigger:** "Save" under "Settings" on `/me`.
- **Who:** signed-in members.
- **Path:** `me/profile-form.tsx` → Server Action `updateProfile` (`me/actions.ts`, `memberUpdate` from `@workspace/shared`) → `PATCH /me` → `MembersService.update`.
- **Data:** writes `user.name` and `members` (ZIP, distance, disciplines, change alerts, weekly digest).
- **Rules:** name up to 80 characters; ZIP is 5 digits or empty (empty clears it); distance 5–300 miles (the form offers 25, 60, 120 and 200); up to the four disciplines; nothing here is ever public. Each member only changes their own: the API ignores anything else in the request, such as an email.
- **Errors:** the browser stops a ZIP that isn't 5 digits at the field before sending. Errors found by the server show a message next to the ZIP field; after an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010). A name over 80 characters is pointed out at its field ("Keep your name under 80 characters."); until 2026-11-18 the name field had no error slot, so nothing was highlighted.
- **Test:** `e2e/account.update.e2e.ts` (settings saved and kept after a reload, an empty ZIP clears it, a short ZIP stopped by the browser, a too-long name pointed out at its field, the API checks every field again, a member only changes their own, signed out 401)
- **Observe:** API log lines with `bit: "account.update"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
