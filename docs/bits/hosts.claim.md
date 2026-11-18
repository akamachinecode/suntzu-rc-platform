# hosts.claim — Someone claims a club or track

- **Trigger:** "Claim it" on `/organise` (linked from every club and place page as `/organise?club=<slug>`, which picks the club).
- **Who:** signed-in members. Signed out, the page shows "Sign in to claim" (back to the same club after signing in) and the API answers 401.
- **Path:** `organise/claim-form.tsx` → `startClaim` (`(site)/organise/actions.ts`) → `POST /organise/claims` (`claimInput`) → `OrganiseService.claim`.
- **Data:** writes `host_members` (method, a hashed 6-digit code for 30 minutes); emails the code to an address at the club's domain, or tells the crew (`CREW_INBOX`, with the member's note).
- **Rules:** the email must be at the club's own domain (shared hosts such as Facebook, Wix or Gmail never count); one code every 5 minutes per member and club, so a club's inbox isn't flooded; the website code is derived from the member and the club, nothing to store; the crew method waits for a person at `/crew/claims`. Each claim then shows on `/organise` with its next step (the code field, the website code, or "The crew is checking").
- **Errors:** wrong domain → "Use an address at …"; an unknown club → 404. After an error the form keeps what was typed, the cursor goes to the first field with an error, each error is read with its field, and the answer is announced (`components/forms/feedback.tsx`, spec 0010). A refusal shows the API's reason, read from the typed client's `error` by `apiErrorText` (`apps/app/src/lib/api-error.ts`); until 2026-11-18 it re-read a response body the client had already read, so every refusal said "Could not start the claim." (the same in `hosts.verify` and `organiser.publish`).
- **Test:** `e2e/hosts.claim.e2e.ts` (an address at the club's domain gets the code there, a second code within 5 minutes is refused; another domain is refused, what was typed kept, nothing sent; the crew method emails the crew inbox and shows at `/crew/claims`; the website method shows the code; signed out "Sign in to claim" and 401; an unknown club 404)
- **Observe:** API log lines with `bit: "hosts.claim"`.
- **Status:** verified — 2026-11-18 (end-to-end test)
