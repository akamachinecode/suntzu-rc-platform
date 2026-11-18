# notes.create — A user adds a note

Example bit that ships with the template: copy its shape for real features, then delete it with the notes example.

- **Trigger:** a signed-in user submits the form on `/notes`.
- **Who:** signed-in users.
- **Path:** `apps/app/src/app/(app)/notes/note-form.tsx` → Server Action `createNote` (`apps/app/src/app/(app)/notes/actions.ts`, validates with `noteInput` from `@workspace/shared`) → `getApi()` → `POST /notes` → `AuthGuard` → `ZodPipe(noteInput)` → `NotesService.create` → PostgreSQL → the page refreshes.
- **Data:** writes one row in `notes` with `owner_id` set to the caller.
- **Rules:** title required (up to 120 characters), body up to 5000; the owner always comes from the session, never from the request.
- **Errors:** invalid input shows a message next to the field (checked in the app and again in the API); an API failure shows "Could not save the note". After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** none yet.
- **Observe:** API log lines with `bit: "notes.create"`.
- **Status:** read in code — 2026-10-27
