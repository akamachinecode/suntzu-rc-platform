# contact.send — A visitor sends the contact form

- **Trigger:** a visitor submits the form on `/contact` (topics: lessons, event, correction…).
- **Who:** anyone.
- **Path:** `apps/app/src/app/contact/contact-form.tsx` → Server Action `submitContact` (`contact/actions.ts`, Zod).
- **Data:** nothing is stored or sent yet: the action only logs name and topic.
- **Rules:** name, email and message are validated.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet.
- **Observe:** app server log line "Contact form submission".
- **Status:** read in code — 2026-10-27
