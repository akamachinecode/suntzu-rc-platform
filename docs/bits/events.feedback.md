# events.feedback — Someone says whether an event's information was right

- **Trigger:** "Were you there? Was this information right?" on the page of an event that is over (held, or its last day has passed in its own time zone): "Yes" or "Something was off", an optional note, "Send".
- **Who:** anyone.
- **Path:** event page (`apps/app/src/components/events/event-feedback.tsx`) → Server Action `sendFeedback` (`apps/app/src/app/(site)/events/[slug]/actions.ts`) → `POST /events/{slug}/feedback` (`feedbackInput`) → Turnstile → `InboxService.feedback` → `feedback`. The crew reads it on `/crew` (`crew.feedback`).
- **Data:** writes `feedback` (yes or no, optional note). Anonymous: nothing about who sent it.
- **Rules:** only published events (404 otherwise); a yes or no and a note of up to 1000 characters (400 otherwise); no session needed. Upcoming events don't ask.
- **Errors:** the widget shows "Could not send. Try again in a minute." Known bug (2026-11-18): the widget renders no Turnstile and sends no token (`event-feedback.tsx:64`), so with `TURNSTILE_SECRET_KEY` set (production) every answer is refused with 403. The end-to-end tests run without Turnstile and can't see it.
- **Test:** `e2e/events.feedback.e2e.ts` (a visitor says something was off on a past event and the crew reads it, "Yes" without a note, an upcoming event doesn't ask, 404 for an unknown event and 400 for a broken answer)
- **Observe:** API log lines with `bit: "events.feedback"`; the crew sees it under Feedback.
- **Status:** verified — 2026-11-18 (end-to-end test)
