# notify.organiser-report — Organisers get their club's monthly report

- **Trigger:** `pnpm notify` on the 1st of the month, Florida time (or `pnpm notify report`).
- **Who:** the platform.
- **Path:** `sendReports` in `apps/api/src/notify/notify.ts`.
- **Data:** reads verified `host_members`, `follows` of the club, its next ten published events that haven't ended, with their going counts; writes `notifications` (one per organiser, club and month).
- **Rules:** one per organiser, club and month, however often it runs; skipped, for all their clubs, for organisers who turned it off (`members.monthly_report`, with the one-click link in the report: My SunTzu RC has no setting for it). An organiser who has never opened My SunTzu RC has no settings yet, so their report comes without that link.
- **Errors:** a send that fails is logged and retried by the next run; the others still go.
- **Test:** `e2e/notify.organiser-report.e2e.ts` (a new organiser gets their club's report with its followers, an upcoming event and how many are going, the dashboard and stop links, once; an organiser who stopped it gets none for a second club while a fellow organiser does)
- **Observe:** the `notify:` line.
- **Status:** verified — 2026-11-18 (end-to-end test)
