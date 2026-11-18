# messages.create — A visitor writes to the crew

- **Trigger:** the contact form (`/contact`) or "Show us your build" (`/community`).
- **Who:** anyone.
- **Path:** Server Action → `POST /messages` (`messageInput`, `apps/api/src/inbox/inbox.controller.ts`) → Turnstile check (`common/turnstile.ts`, production) → `InboxService.message` → `messages`, and an email to `CREW_INBOX` when set ("New message on SunTzu RC: <topic>" or "New build on SunTzu RC: <model>", with a button to `/crew`). The crew reads it on `/crew` (`crew.inbox`).
- **Data:** writes `messages` (name, email, message, optional link). Deleted after 12 months.
- **Rules:** no session needed. Kind `contact` or `build`, a topic of up to 40 characters, a name, a valid email, a message of 10 to 5000 characters and an optional link that must be http(s) (`packages/shared/src/community.ts`). Rejected without a valid Turnstile token when `TURNSTILE_SECRET_KEY` is set (not in the end-to-end tests).
- **Errors:** what breaks the rules answers 400 and is neither saved nor emailed; the forms show a message next to the field. If the email to the crew fails the message is still saved.
- **Test:** `e2e/messages.create.e2e.ts` (a message reaches the crew's inbox and `CREW_INBOX` without signing in, a build is announced as a build, eight broken messages answer 400 and reach nobody)
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
