# places.confirm — A steward confirms a place's details

- **Trigger:** "Confirm details" under "Your fields and tracks" on the club dashboard (`/organise/<club>`).
- **Who:** the club's verified organisers; anyone else gets 403 (401 signed out).
- **Path:** `organise/[host]/page.tsx` → `confirmPlace` (`organise/[host]/actions.ts`, `placeConfirm`) → `POST /organise/{host}/places/{slug}/confirm` → `OrganiseService.confirmPlace`.
- **Data:** writes `places.access`, `notes` and `verified_at` (now). The place's page then says how to visit ("How to visit: guests welcome"), shows the notes and "last checked" with today's date.
- **Rules:** only the club's own places (not another club's, nor a place no club runs); who can use it is one of open to everyone, guests welcome, members only, ask first.
- **Errors:** 404 for a place that isn't the club's; 400 for any other access value. The dashboard says nothing after confirming. After "Confirm details" the "Who can use it" list shows the saved answer: the select is keyed by it, because React only reads a select's `defaultValue` when it mounts (fixed 2026-11-18; before, it showed the old answer and confirming again saved it back).
- **Test:** `e2e/places.confirm.e2e.ts` (an organiser confirms who can use the field and its notes, and the place page shows them, last checked today; the dashboard keeps showing the new answer; another club's place 404 and 403, a place no club runs 404, an unknown one 404, a bad access 400, a member 403 and a visitor 401, and nothing changes)
- **Observe:** API log lines with `bit: "places.confirm"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
