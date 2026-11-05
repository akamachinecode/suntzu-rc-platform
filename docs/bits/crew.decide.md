# crew.decide — The crew decides a review

- **Trigger:** Publish / Apply / Same event, Correct, or Not an RC event / Ignore / Different events, on a review card.
- **Who:** the crew.
- **Path:** `crew/review-card.tsx` → Server Actions `decide` / `correct` (`crew/actions.ts`) → `POST /crew/reviews/{id}/decision` → `CrewService.decide` → `applyPatch` (`events/engine/resolve.ts`).
- **Data:** writes `events` (published, rejected, corrected fields), `event_sightings` (merges), `changes` (by `crew`), and the review's status, reviewer and date.
- **Rules:** new event: publish, correct and publish, or reject (stays hidden, `rejected_at`, never auto-published again). Change: apply the proposal, apply a correction, or ignore. Same event?: merge (link and apply), or different (resolve runs at once and treats it as new).
- **Errors:** a decided review answers 404; a proposal that no longer fits answers 422.
- **Test:** none yet
- **Observe:** API log lines with `bit: "crew.decide"`.
- **Status:** verified — 2026-10-27
