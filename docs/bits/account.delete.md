# account.delete — A member deletes their account

- **Trigger:** "Delete my account" on `/me`, after typing "delete".
- **Who:** signed-in members.
- **Path:** `me/page.tsx` form → Server Action `deleteAccount` → `DELETE /me` → `MembersService.remove` → `delete from user` (cascades).
- **Data:** deletes `user` and with it `session`, `account`, `members`, `follows`, `rsvps`, `host_members`, `notifications`; `submissions`, `messages`, `try_requests` and `reviews.submitted_by` lose the link to the person.
- **Rules:** irreversible; contributions to the public catalogue stay without a name.
- **Errors:** without the confirmation word nothing happens.
- **Test:** none yet
- **Observe:** API log lines with `bit: "account.delete"`.
- **Status:** read in code — 2026-10-27
