# notify.unsubscribe — Someone stops an email with one click

- **Trigger:** the mail app's unsubscribe button (List-Unsubscribe, RFC 8058) or the link in the email → `/unsubscribe`.
- **Who:** anyone with the link.
- **Path:** mail app → `POST /unsubscribe?token&what`; or `apps/app/src/app/unsubscribe/page.tsx` → "Stop …" button → the same endpoint.
- **Data:** turns off `members.change_alerts`, `weekly_digest` or `monthly_report`.
- **Rules:** the secret email token is the key; opening the link changes nothing until the button is pressed.
- **Errors:** unknown token → "That link doesn't work any more".
- **Test:** none yet
- **Observe:** API log lines with `bit: "notify.unsubscribe"`.
- **Status:** verified — 2026-10-27
