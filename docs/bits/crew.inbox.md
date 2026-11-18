# crew.inbox — The crew reads the inbox and marks messages as handled

- **Trigger:** the crew opens `/crew` ("Inbox") and clicks "Mark as handled" on a message.
- **Who:** the crew only (`CREW_EMAILS`, checked on every request).
- **Path:** `apps/app/src/app/(app)/crew/page.tsx` → `getApi()` → `GET /crew/messages` (`@CrewOnly()`, `apps/api/src/crew/crew.controller.ts`) → `CrewService.messages` (`crew.service.ts`). "Mark as handled" → Server Action `handleMessage` (`crew/actions.ts`) → `POST /crew/messages/{id}/handled` → `CrewService.handleMessage` → `revalidatePath("/crew")`.
- **Data:** reads `messages` (what `messages.create` writes: the contact form, builds, and events `submissions.create` couldn't read); writes `handled_at`.
- **Rules:** the 200 latest messages, those still to handle first, newest first. Each shows what it's about (the topic, or "Build"), who wrote with a `mailto:` link to reply, the message and its link. Handled messages stay in the list, dimmed and without the button. The header counts the messages still to handle (`GET /crew/summary`).
- **Errors:** the list and the button answer 401 without a session and 403 to anyone outside the crew, and `/crew` shows "Crew only"; signed out, `/crew` sends the visitor to `/sign-in` (`proxy.ts`). An unknown message answers 404, an id that isn't a UUID 400.
- **Test:** `e2e/crew.inbox.e2e.ts` (the crew reads a message and marks it as handled, messages to handle come first, 404 and 400, 401 signed out, 403 and "Crew only" for a member)
- **Observe:** API log lines with `bit: "crew.inbox"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
