# notes.list — A user sees their notes

Example bit that ships with the template: copy its shape for real features, then delete it with the notes example.

- **Trigger:** a signed-in user opens `/notes`.
- **Who:** signed-in users; each one sees only their own notes.
- **Path:** `apps/app/src/app/notes/page.tsx` (Server Component) → `getApi()` (`apps/app/src/lib/api.ts`, forwards the cookie and `x-request-id`) → Cloudflare → `GET /notes` → `AuthGuard` → `NotesController.list` → `NotesService.list` → PostgreSQL.
- **Data:** reads `notes` where `owner_id` is the signed-in user.
- **Rules:** deny by default; every query is scoped to the caller.
- **Errors:** without a session the API answers 401 and the page redirects to `/sign-in`.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "notes.list"`.
- **Status:** read in code — 2026-10-27
