# account.delete — A member deletes their account

- **Trigger:** "Delete my account" on `/me`, after typing "delete".
- **Who:** signed-in members, only their own account.
- **Path:** `me/page.tsx` form → Server Action `deleteAccount` (`me/actions.ts`) → `DELETE /me` → `MembersService.remove` → `delete from user` (cascades) → the home page (`/?account=deleted`, which shows no message yet), or `/me?delete=failed` with "We couldn't delete your account just now" if the API refused.
- **Data:** deletes `user` and with it `session`, `account`, `members`, `follows`, `rsvps`, `host_members`, `notifications` and `notes`; `submissions`, `messages`, `try_requests` and `reviews.submitted_by` lose the link to the person.
- **Rules:** irreversible; contributions to the public catalogue stay without a name. The session ends at once, the public counts drop, and the private calendar link stops working. Signing in again with the same email starts a new, empty account with new secret links.
- **Errors:** without the confirmation word nothing happens: the field is required and only takes "delete" (or "Delete": phones capitalise it, no autocorrect), so the browser stops at it and says what to type; the action checks the word again.
- **Test:** `e2e/account.delete.e2e.ts` (deleting with "Delete" ends the session, removes follows, "going", notes and the calendar link, and signing in again starts fresh; a wrong or empty word deletes nothing; a member can only delete their own account; signed out 401)
- **Observe:** API log lines with `bit: "account.delete"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
