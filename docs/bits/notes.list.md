# notes.list — A user sees their notes

Example bit that ships with the template: copy its shape for real features, then delete it with the notes example.

- **Trigger:** a signed-in user opens `/notes`.
- **Who:** signed-in users; each one sees only their own notes.
- **Path:** `apps/app/src/app/(app)/notes/page.tsx` (Server Component) → `getApi()` (`apps/app/src/lib/api.ts`, forwards the cookie and `x-request-id`) → Cloudflare → `GET /notes` → `AuthGuard` → `NotesController.list` → `NotesService.list` → PostgreSQL.
- **Data:** reads `notes` where `owner_id` is the signed-in user.
- **Rules:** deny by default; every query is scoped to the caller.
- **Errors:** without a session `proxy.ts` sends the visitor to `/sign-in?next=/notes`; the API answers 401.
- **Test:** `e2e/notes.list.e2e.ts` (a new member's empty list, their notes newest first, never another member's, signed out → sign-in and 401)
- **Observe:** API log lines with `bit: "notes.list"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
