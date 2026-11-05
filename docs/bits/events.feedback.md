# events.feedback — Someone says whether an event's information was right

- **Trigger:** "Was this information right?" on a past event's page.
- **Who:** anyone.
- **Path:** event page → `POST /events/{slug}/feedback` → Turnstile → `InboxService.feedback`.
- **Data:** writes `feedback` (yes or no, optional note). Anonymous.
- **Rules:** only published events.
- **Errors:** the widget shows "Could not send".
- **Test:** none yet
- **Observe:** API log lines with `bit: "events.feedback"`; the crew sees it under Feedback.
- **Status:** read in code — 2026-10-27
