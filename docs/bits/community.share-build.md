# community.share-build — A visitor shares a build

- **Trigger:** a visitor submits "Show us your build" on `/community`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/community/build-form.tsx` → Server Action `submitBuild` (`community/actions.ts`, Zod) → `POST /messages` with kind `build` (see `messages.create`).
- **Data:** writes a `messages` row for the crew's inbox (and emails `CREW_INBOX` when set).
- **Rules:** consent to publish is required.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "messages.create"`.
- **Status:** read in code — 2026-10-27
