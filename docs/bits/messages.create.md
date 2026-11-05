# messages.create — A visitor writes to the crew

- **Trigger:** the contact form (`/contact`) or "Show us your build" (`/community`).
- **Who:** anyone.
- **Path:** Server Action → `POST /messages` (`messageInput`) → Turnstile check (`common/turnstile.ts`, production) → `InboxService.message` → `messages`, and an email to `CREW_INBOX` when set.
- **Data:** writes `messages` (name, email, message, optional link). Deleted after 12 months.
- **Rules:** rejected without a valid Turnstile token when `TURNSTILE_SECRET_KEY` is set.
- **Errors:** invalid fields show a message next to them; if the email to the crew fails the message is still saved.
- **Test:** none yet
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** read in code — 2026-10-27
