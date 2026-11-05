# community.share-build — A visitor shares a build

- **Trigger:** a visitor submits "Show us your build" on `/community`.
- **Who:** anyone.
- **Path:** `apps/app/src/app/community/build-form.tsx` → Server Action `submitBuild` (`community/actions.ts`, Zod).
- **Data:** nothing is stored or sent yet: the action only logs name and model.
- **Rules:** consent to publish is required.
- **Errors:** invalid fields show a message next to them.
- **Test:** none yet.
- **Observe:** app server log line "Build submission".
- **Status:** read in code — 2026-10-27
