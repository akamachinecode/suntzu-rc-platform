# notify.unsubscribe — Someone stops an email with one click

- **Trigger:** the mail app's unsubscribe button (List-Unsubscribe, RFC 8058) or the "Stop …" link at the foot of a change alert, weekly digest or monthly club report (`apps/api/src/notify/notify.ts`) → `/unsubscribe?token&what`.
- **Who:** anyone with the link; no sign-in.
- **Path:** mail app → `POST {API}/unsubscribe?token&what`; or `apps/app/src/app/(site)/unsubscribe/page.tsx` → "Stop change alerts" / "Stop the weekly email" / "Stop the monthly club report" button (`stop-button.tsx`) → Server Action `unsubscribe` (`actions.ts`) → the same endpoint → `MembersService.unsubscribe`.
- **Data:** turns off `members.change_alerts`, `weekly_digest` or `monthly_report`.
- **Rules:** the member's secret email token (`members.email_token`, made with their settings the first time they open `/me`) is the key, the same for every kind; `what` (`alerts`, `digest`, `report`) picks which email stops, nothing else changes. Opening the link changes nothing until the button is pressed (mail scanners open links).
- **Errors:** unknown token → "That link doesn't work any more. Change your emails in My SunTzu RC."; a link without `token` or `what` → "This link is incomplete."; the API answers 404 for an unknown token or kind.
- **Test:** `e2e/notify.unsubscribe.e2e.ts` (the link in a real change alert stops alerts only after the button is pressed, the one-click POST from the mail app stops them too, the same token stops the weekly email and nothing of another member's, made-up and incomplete links say so and the API answers 404)
- **Observe:** API log lines with `bit: "notify.unsubscribe"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
