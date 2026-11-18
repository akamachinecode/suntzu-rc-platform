# hosts.verify — A claim is proved

- **Trigger:** the code from the email ("Verify" on `/organise`), "Check my website", or the crew's Approve / Reject at `/crew/claims`.
- **Who:** the claimant; the crew for hand checks (anyone else gets 403 there, 401 signed out).
- **Path:** `organise/verify-panel.tsx` → `enterCode` / `checkWebsite` (`(site)/organise/actions.ts`) → `POST /organise/claims/{host}/code`, `POST /organise/claims/{host}/website` (fetches the home page and `/servo.txt`); `crew/claims/page.tsx` → `decideClaim` → `POST /crew/claims/{host}/{user}/approve` (anything else than `approve` rejects) → `OrganiseService.markVerified` or the claim's deletion.
- **Data:** sets `host_members.verified_at`, and `hosts.verified_at` / `claimed_at` the first time (the club page then shows "Verified: its organisers publish here"); a rejection deletes the claim.
- **Rules:** wrong or expired codes fail; every guess counts, and after 8 wrong codes the claim is locked (even the right code is refused: only the crew can verify it then); several officers can verify the same club. Once verified, `/organise` links to the club dashboard.
- **Errors:** messages say what to fix; a member who was never sent a code gets 404. The code field takes the code from the email in one go (`autocomplete="one-time-code"`), with or without the space. **Known bug (2026-11-18):** a wrong code reads "That didn't work. Try again." instead of "That code isn't right." (`apiErrorText`, see [hosts.claim](./hosts.claim.md)).
- **Test:** `e2e/hosts.verify.e2e.ts` (the emailed code typed "123 456" verifies and opens the dashboard, the club page shows Verified; a wrong code is refused and the right one still works (fails on the wording: the known bug); 8 wrong codes lock the claim; the crew approves at `/crew/claims` and a second officer runs the club too; the crew rejects and the claim is gone; a member 403 and a visitor 401 can't approve; no code sent, 404). "Check my website" isn't run: it fetches the club's real site on the internet.
- **Observe:** API log lines with `bit: "hosts.verify"`.
- **Status:** verified — 2026-11-18 (end-to-end test; one known bug, see Errors)
