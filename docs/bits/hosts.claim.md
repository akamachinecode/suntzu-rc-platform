# hosts.claim — Someone claims a club or track

- **Trigger:** "Claim it" on `/organise` (linked from every club and place page).
- **Who:** signed-in members.
- **Path:** `organise/claim-form.tsx` → `startClaim` → `POST /organise/claims` → `OrganiseService.claim`.
- **Data:** writes `host_members` (method, a hashed 6-digit code for 30 minutes); emails the code to an address at the club's domain, or tells the crew.
- **Rules:** the email must be at the club's own domain (shared hosts such as Facebook, Wix or Gmail never count); the website code is derived from the member and the club, nothing to store; the crew method waits for a person.
- **Errors:** wrong domain → "Use an address at …".
- **Test:** none yet
- **Observe:** API log lines with `bit: "hosts.claim"`.
- **Status:** verified — 2026-10-27
