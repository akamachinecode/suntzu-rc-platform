# places.confirm — A steward confirms a place's details

- **Trigger:** "Confirm details" on the club dashboard.
- **Who:** the club's verified organisers.
- **Path:** `confirmPlace` → `POST /organise/{host}/places/{slug}/confirm` → `OrganiseService.confirmPlace`.
- **Data:** writes `places.access`, `notes` and `verified_at` (today).
- **Rules:** only the club's own places.
- **Errors:** 404 for others.
- **Test:** none yet
- **Observe:** API log lines with `bit: "places.confirm"`.
- **Status:** read in code — 2026-10-27
