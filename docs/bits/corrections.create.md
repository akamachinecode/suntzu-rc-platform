# corrections.create — A member suggests a correction

- **Trigger:** "Suggest a correction" on an event page.
- **Who:** signed-in members.
- **Path:** event page form → `POST /events/{slug}/corrections` (`correctionInput`) → `InboxService.correction` → a `change` review.
- **Data:** writes `reviews` with the proposed fields, the note and `submitted_by`.
- **Rules:** never applied without the crew.
- **Errors:** invalid fields show a message next to them. After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010).
- **Test:** none yet
- **Observe:** API log lines with `bit: "corrections.create"`.
- **Status:** read in code — 2026-10-27
