# try.request — A newcomer asks to try RC

- **Trigger:** "Find me a club" on `/try` (linked from the home page, clubs that welcome newcomers and the community page).
- **Who:** anyone.
- **Path:** `apps/app/src/app/try/try-form.tsx` → `askToTry` → `POST /try` (`tryInput`, Turnstile) → `NewcomersService.request` (`apps/api/src/newcomers/`) → emails to organisers, or to `CREW_INBOX`; the crew sees open ones at `/crew/claims` (`GET /crew/try`).
- **Data:** reads `zip_codes`, `hosts`, `places`, `host_members`; writes `try_requests` (name, email, ZIP, discipline, message, who it went to). Deleted after 12 months.
- **Rules:** up to three clubs within 60 miles that welcome newcomers, have a verified organiser and fly that discipline (or haven't said); only with the person's consent; otherwise it goes to the crew.
- **Errors:** unknown ZIP → "Is it in Florida?".
- **Test:** none yet
- **Observe:** API log lines with `bit: "try.request"`.
- **Status:** verified — 2026-10-27
