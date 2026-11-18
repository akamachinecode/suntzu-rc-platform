# notify.changes — Followers hear that an event moved or was cancelled

- **Trigger:** `pnpm notify` (every hour once deployed, spec 0004).
- **Who:** the platform.
- **Path:** `apps/api/src/notify.ts` → `sendAlerts` (`apps/api/src/notify/notify.ts`) → `sendMail`.
- **Data:** reads the last week of `changes` (dates, cancellations), `follows`, `rsvps`, `members`; writes `notifications` before each email.
- **Rules:** members who follow or go to the event, or follow its club or field, with change alerts on; one email per member and set of changes, never twice; "confirmed" and "held" aren't news. One-click unsubscribe (`POST /unsubscribe`).
- **Errors:** a send that fails is logged and its record removed, so the next run retries it; the other emails still go. A part of the run that fails (alerts, digest, reports, clean-up) doesn't stop the others; the command exits 1.
- **Test:** `e2e/notify.changes.e2e.ts` (a follower hears that the dates moved, in one email for the first and last day, and not again on the next run; people going and followers of the club and of the field hear it's cancelled; "confirmed" isn't news and a member with alerts off hears nothing; a member who follows straight after signing in, without opening My SunTzu RC, hears too: this one fails, see Status)
- **Observe:** the `notify:` line printed by the command; `[Mail]` locally.
- **Status:** broken — 2026-11-18 (end-to-end test: works for members who have opened My SunTzu RC once; someone who signs in from an event's Follow or Going button and never opens it has no `members` row, which `sendAlerts` joins on, so they get no alerts although alerts are on by default)
