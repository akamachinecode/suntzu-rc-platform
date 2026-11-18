# organiser.update-club — An organiser keeps the club's page current

- **Trigger:** "Save" under "The club's page" on `/organise/<club>`.
- **Who:** the club's verified organisers; anyone else gets 403 (401 signed out).
- **Path:** `organise/[host]/club-form.tsx` → `saveClub` (`organise/[host]/actions.ts`, `hostUpdate` from `@workspace/shared`) → `PATCH /organise/{host}` → `OrganiseService.updateHost`.
- **Data:** writes `hosts.summary`, `url`, `disciplines` and `accepts_newcomers`. The public club page (`/clubs/<club>`) shows them at once.
- **Rules:** the website must be an http(s) link, and an empty one clears it; up to the four disciplines; "We welcome newcomers" makes the club page invite newcomers and sends nearby "try it" requests to the club's organisers ([try.request](./try.request.md), clubs with a field only). With no `hosts.domain` saved, the website's domain is the one email claims must use ([hosts.claim](./hosts.claim.md)).
- **Errors:** a link that isn't http(s) → "Check the website link." and nothing is saved; an unknown club answers 404. **Known bug (2026-11-18):** after that message the form shows the saved values again, losing what was typed (spec 0010: every form keeps it): `saveClub` returns no typed values and the fields only read the saved ones (`club-form.tsx`).
- **Test:** `e2e/organiser.update-club.e2e.ts` (an organiser saves the summary, website, what they fly and newcomers, and the club page shows them; turning newcomers off removes the invitation; an ftp link is refused and nothing changes, what was typed kept (fails: the known bug); another club 403, an unknown club 404, a bad link 400, a member 403 and a visitor 401 change nothing)
- **Observe:** API log lines with `bit: "organiser.update-club"`.
- **Status:** verified — 2026-11-18 (end-to-end test; one known bug, see Errors)
