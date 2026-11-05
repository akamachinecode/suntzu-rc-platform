# notify.changes — Followers hear that an event moved or was cancelled

- **Trigger:** `pnpm notify` (every hour once deployed, spec 0004).
- **Who:** the platform.
- **Path:** `apps/api/src/notify.ts` → `sendAlerts` (`apps/api/src/notify/notify.ts`) → `sendMail`.
- **Data:** reads the last week of `changes` (dates, cancellations), `follows`, `rsvps`, `members`; writes `notifications` before each email.
- **Rules:** members who follow or go to the event, or follow its club or field, with change alerts on; one email per member and set of changes, never twice; "confirmed" and "held" aren't news. One-click unsubscribe (`POST /unsubscribe`).
- **Errors:** a failed send stops the run; a new run continues where it stopped.
- **Test:** none yet
- **Observe:** the `notify:` line printed by the command; `[Mail]` locally.
- **Status:** verified — 2026-10-27
