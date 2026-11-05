# submissions.create — A member sends an event

- **Trigger:** "Send the event" on `/submit` (linked from the calendar).
- **Who:** signed-in members.
- **Path:** `apps/app/src/app/submit/submit-form.tsx` → `sendEvent` → `POST /submissions` → `SubmissionsService.submit` (`apps/api/src/submissions/`): a link is read by the `PoliteFetcher` (ICS or JSON-LD, then the AI on the page text); pasted text by the AI (`events/engine/ai.ts`, Claude on Amazon Bedrock with quotes checked by `verify`) → sightings from the `member-submissions` source → `resolve`.
- **Data:** writes `submissions`, `sightings`, and through resolve `events`/`reviews` with `submitted_by`; or a `messages` row for the crew when nothing could be read.
- **Rules:** community trust: new events wait for the crew unless another source agrees; a link to an event we have counts as one more source. AI fields without a word-for-word quote are dropped; the AI is off without `BEDROCK_MODEL_ID`.
- **Errors:** robots.txt or a bot wall → the crew's inbox.
- **Test:** `apps/api/src/events/engine/ai.test.ts` (quote checks); the Bedrock call itself isn't run locally.
- **Observe:** API log lines with `bit: "submissions.create"`.
- **Status:** verified — 2026-10-27
