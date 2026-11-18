# corrections.create — A member suggests a correction

- **Trigger:** "Suggest a correction" on an event page ("Where this comes from"): the right first and last day, the organiser's page, "It's been cancelled", what's wrong, and where they saw it.
- **Who:** signed-in members.
- **Path:** event page (`apps/app/src/components/events/correction-form.tsx`) → Server Action `suggestCorrection` (`apps/app/src/app/(site)/events/[slug]/actions.ts`, `correctionInput`) → `POST /events/{slug}/corrections` → `InboxService.correction` → a `change` review in the crew's queue on `/crew` ("Something changed", "From a member"; decided in `crew.decide`).
- **Data:** writes `reviews` (kind `change`) with the proposed fields, the note (plus "Seen at <link>") and `submitted_by`.
- **Rules:** never applied without the crew: the event keeps its dates until the crew decides. Only published events (404). A note of 5+ characters, http(s) links, real dates; the last day can't be before the first (400); a new first day alone keeps the event's length. At most 20 corrections a member an hour (429, "That's a lot of corrections at once. Try again in an hour.").
- **Errors:** signed out, the form answers "Sign in to suggest a correction, or write to us." (the API answers 401). Invalid fields show a message next to them. After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** `e2e/corrections.create.e2e.ts` (a member suggests new dates and the crew sees it in the queue while the event keeps its dates, a new first day keeps the length, signed out asks to sign in and 401, the rules answer 400 and 404, 20 an hour then 429); `apps/app/e2e/forms.spec.ts` (opening the form puts the cursor in it)
- **Observe:** API log lines with `bit: "corrections.create"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
