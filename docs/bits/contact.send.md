# contact.send — A visitor sends the contact form

- **Trigger:** a visitor submits the form on `/contact` (topics: lessons, event, correction…).
- **Who:** anyone.
- **Path:** `apps/app/src/app/contact/contact-form.tsx` → Server Action `submitContact` (`contact/actions.ts`, Zod) → `POST /messages` (see `messages.create`).
- **Data:** writes a `messages` row for the crew's inbox (and emails `CREW_INBOX` when set).
- **Rules:** name, email and message are validated.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** verified — 2026-10-27 (through the API)
