# notes.get — The API returns one of the user's notes

Example bit that ships with the template: no screen uses it yet. Delete it with the notes example.

- **Trigger:** `GET /notes/{id}` on the API (for example from a future detail page or the mobile app).
- **Who:** the owner of the note.
- **Path:** caller → Cloudflare → `AuthGuard` → `NotesController.get` → `NotesService.get` → PostgreSQL.
- **Data:** reads one row in `notes`.
- **Rules:** someone else's note answers 404 (not 403) so IDs can't be probed; the ID must be a UUID.
- **Errors:** an invalid ID answers 400; an unknown or foreign one, 404.
- **Test:** `e2e/notes.get.e2e.ts` (the owner gets their note, another member gets 404 like for an unknown ID, signed out 401, an ID that isn't a UUID 400)
- **Observe:** API log lines with `bit: "notes.get"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
