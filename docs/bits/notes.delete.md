# notes.delete — A user deletes one of their notes

Example bit that ships with the template: copy its shape for real features, then delete it with the notes example.

- **Trigger:** a signed-in user presses "Delete" on a note in `/notes`.
- **Who:** the owner of the note.
- **Path:** Server Action `deleteNote` (`apps/app/src/app/notes/actions.ts`) → `getApi()` → `DELETE /notes/{id}` → `AuthGuard` → `NotesService.remove` → PostgreSQL → the page refreshes.
- **Data:** deletes one row in `notes`.
- **Rules:** only the owner can delete; someone else's note answers 404 (not 403) so IDs can't be probed.
- **Errors:** an unknown or foreign ID answers 404.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "notes.delete"`.
- **Status:** read in code — 2026-10-27
