# hosts.verify — A claim is proved

- **Trigger:** the code from the email, "Check my website", or the crew's approval at `/crew/claims`.
- **Who:** the claimant; the crew for hand checks.
- **Path:** `POST /organise/claims/{host}/code`, `POST /organise/claims/{host}/website` (fetches the home page and `/servo.txt`), `POST /crew/claims/{host}/{user}/approve` → `OrganiseService.markVerified`.
- **Data:** sets `host_members.verified_at`, and `hosts.verified_at` / `claimed_at` the first time.
- **Rules:** wrong or expired codes fail; several officers can verify the same club.
- **Errors:** messages say what to fix.
- **Test:** none yet
- **Observe:** API log lines with `bit: "hosts.verify"`.
- **Status:** verified — 2026-10-27
