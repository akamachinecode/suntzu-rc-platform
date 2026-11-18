# notes.delete — A user deletes one of their notes

Example bit that ships with the template: copy its shape for real features, then delete it with the notes example.

- **Trigger:** a signed-in user presses "Delete" on a note in `/notes`.
- **Who:** the owner of the note.
- **Path:** Server Action `deleteNote` (`apps/app/src/app/(app)/notes/actions.ts`) → `getApi()` → `DELETE /notes/{id}` → `AuthGuard` → `NotesService.remove` → PostgreSQL → the page refreshes.
- **Data:** deletes one row in `notes`.
- **Rules:** only the owner can delete; someone else's note answers 404 (not 403) so IDs can't be probed.
- **Errors:** an unknown, foreign or already deleted ID answers 404.
- **Test:** `e2e/notes.delete.e2e.ts` (a member deletes their notes on `/notes`, another member gets 404 and the note stays, signed out 401 and the note stays, deleting twice 404)
- **Observe:** API log lines with `bit: "notes.delete"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
