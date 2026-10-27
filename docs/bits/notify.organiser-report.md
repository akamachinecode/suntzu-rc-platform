# notify.organiser-report — Organisers get their club's monthly report

- **Trigger:** `pnpm notify` on the 1st (or `pnpm notify report`).
- **Who:** the platform.
- **Path:** `sendReports` in `apps/api/src/notify/notify.ts`.
- **Data:** reads verified `host_members`, `follows` of the club, its upcoming events with their going counts; writes `notifications` (one per organiser, club and month).
- **Rules:** skipped for organisers who turned it off (`members.monthly_report`).
- **Errors:** as above.
- **Test:** none yet
- **Observe:** the `notify:` line.
- **Status:** read in code — 2026-10-27
