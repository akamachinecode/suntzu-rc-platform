# contact.send — A visitor sends the contact form

- **Trigger:** a visitor submits the form on `/contact` (topics: lessons, event, correction…).
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/contact/contact-form.tsx` → Server Action `submitContact` (`contact/actions.ts`, Zod) → `POST /messages` (see `messages.create`).
- **Data:** writes a `messages` row for the crew's inbox (and emails `CREW_INBOX` when set).
- **Rules:** name, email, a topic from the list (`TOPICS`) and a message of at least 10 characters, checked by the Server Action and again by the API (`messageInput`). `/contact?topic=<topic>` preselects the topic (the event page's "Tell us" link uses `correction`). Turnstile in production (`messages.create`).
- **Errors:** invalid fields show a message next to them. After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** `e2e/contact.send.e2e.ts` (the form reaches the crew's inbox on `/crew` and `CREW_INBOX`, `?topic=correction` preselects the topic, an invalid email is pointed out and nothing is sent); `apps/app/e2e/forms.spec.ts` (errors keep values, focus, description)
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
