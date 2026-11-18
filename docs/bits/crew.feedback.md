# crew.feedback — The crew reads the feedback left after events

- **Trigger:** the crew opens `/crew` ("Feedback after events") and clicks "Seen" on an answer.
- **Who:** the crew only (`CREW_EMAILS`, checked on every request).
- **Path:** `apps/app/src/app/(app)/crew/page.tsx` → `getApi()` → `GET /crew/feedback` (`@CrewOnly()`, `apps/api/src/crew/crew.controller.ts`) → `CrewService.feedback` (`crew.service.ts`). "Seen" → Server Action `seeFeedback` (`crew/actions.ts`) → `POST /crew/feedback/{id}/seen` → `CrewService.seeFeedback` → `revalidatePath("/crew")`.
- **Data:** reads `feedback` (what `events.feedback` writes) with its event's name and slug; writes `seen_at`.
- **Rules:** only the answers not seen yet, newest first, up to 200: "Right" or "Wrong" about the event (a link to its page) and the note. Anonymous: nothing about who answered. "Seen" takes it off the list. The header counts the new ones (`GET /crew/summary`).
- **Errors:** the list and the button answer 401 without a session and 403 to anyone outside the crew, and `/crew` shows "Crew only". An unknown answer gives 404, an id that isn't a UUID 400.
- **Test:** `e2e/crew.feedback.e2e.ts` (the crew reads a right and a wrong answer and marks one as seen, 404 and 400, 401 signed out, 403 and "Crew only" for a member)
- **Observe:** API log lines with `bit: "crew.feedback"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
