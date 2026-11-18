# community.share-build — A visitor shares a build

- **Trigger:** a visitor submits "Show us your build" on `/community`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/(site)/community/build-form.tsx` → Server Action `submitBuild` (`community/actions.ts`, Zod) → `POST /messages` with kind `build`, the model as the topic (first 40 characters) and as the first line of the message (see `messages.create`). The crew reads it on `/crew` as "Build" (`crew.inbox`).
- **Data:** writes a `messages` row for the crew's inbox and emails `CREW_INBOX` when set ("New build on SunTzu RC: <model>").
- **Rules:** name, email, what was built or flown (2+ characters), the story (20+ characters) and consent to publish are required; the link to photos is optional and must be an http(s) link.
- **Errors:** invalid fields show a message next to them. After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** `e2e/community.share-build.e2e.ts` (a build reaches `/crew` and `CREW_INBOX` as a build; without consent, or with a `javascript:` link, the form says so and nothing is sent)
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
