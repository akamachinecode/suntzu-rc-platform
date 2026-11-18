# crew.decide — The crew decides a review

- **Trigger:** Publish / Apply / Same event, Correct, or Not an RC event / Ignore / Different events, on a review card at `/crew`.
- **Who:** the crew; anyone else gets 403 (401 signed out).
- **Path:** `crew/review-card.tsx` → Server Actions `decide` / `correct` (`crew/actions.ts`) → `POST /crew/reviews/{id}/decision` (`crewDecision`) → `CrewService.decide` → `applyPatch` (`events/engine/resolve.ts`).
- **Data:** writes `events` (published, rejected, corrected fields), `event_sightings` (merges), `changes` (by `crew`), and the review's status, reviewer and date.
- **Rules:** new event: publish, correct and publish, or reject (stays hidden, `rejected_at`, never auto-published again). Change: apply the proposal, apply a correction (the crew's own fields, not the proposal), or ignore (nothing changes). Same event?: merge (link and apply), or different (resolve runs at once and treats it as new). Reviews come from the engine (`engine.resolve`) and from members' corrections (`corrections.create`, always `change` reviews).
- **Errors:** a decided or unknown review answers 404; an action other than approve, correct or reject answers 400; a stored proposal that no longer fits the event's fields answers 422.
- **Test:** `e2e/crew.decide.e2e.ts` (on members' corrections: Apply publishes the proposal, Correct publishes the crew's fix instead, Ignore changes nothing, each card leaves the queue; a member 403 and a visitor 401 change nothing; a second decision 404; an unknown review 404, an unknown action 400). Not end to end: `new-event` and `merge` reviews, which only come from sources read on the internet, and the 422, which no review made by the running system can reach.
- **Observe:** API log lines with `bit: "crew.decide"`.
- **Status:** verified — 2026-11-18 (end-to-end test, `change` reviews)
