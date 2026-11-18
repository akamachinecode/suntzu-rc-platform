# notify.digest — Members get "this weekend near you"

- **Trigger:** `pnpm notify` on Thursdays, Florida time (or `pnpm notify digest`).
- **Who:** the platform.
- **Path:** `sendDigests` in `apps/api/src/notify/notify.ts`.
- **Data:** reads published events dated to the day, not cancelled, from the coming Friday to Sunday (Florida time; run on a Saturday or Sunday, the next weekend), at a place with coordinates; members with the weekly email on and a ZIP code that `zip_codes` knows (loaded by `pnpm census zip-codes`); writes `notifications` (one per member and weekend).
- **Rules:** within the member's distance (60 miles unless they changed it) and disciplines (all when none chosen), nearest first, up to 10; nothing is sent when there's nothing near; one per member and weekend, however often it runs. One-click unsubscribe (`POST /unsubscribe`).
- **Errors:** a send that fails is logged and retried by the next run; the others still go.
- **Test:** `e2e/notify.digest.e2e.ts` (a member with a ZIP code gets the weekend's events within their distance and disciplines, nearest first, without the cancelled, far, other-discipline or next-week ones, and only once; members far from everything or without the weekly email get nothing). The tests load two ZIP codes from the census's saved sample, since `zip_codes` comes from the Census Bureau.
- **Observe:** the `notify:` line.
- **Status:** verified — 2026-11-18 (end-to-end test)
