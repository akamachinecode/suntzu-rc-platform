# notify.digest — Members get "this weekend near you"

- **Trigger:** `pnpm notify` on Thursdays (or `pnpm notify digest`).
- **Who:** the platform.
- **Path:** `sendDigests` in `apps/api/src/notify/notify.ts`.
- **Data:** reads events from Friday to Sunday with a known place, members with the weekly email on and a ZIP code (`zip_codes`); writes `notifications` (one per member and weekend).
- **Rules:** within the member's distance and disciplines, nearest first, up to 10; nothing is sent when there's nothing near.
- **Errors:** as above.
- **Test:** none yet
- **Observe:** the `notify:` line.
- **Status:** read in code — 2026-10-27
