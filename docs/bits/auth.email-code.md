# auth.email-code — Someone signs in by typing the code from the email

- **Trigger:** "Sign in with the code" on the "Check your email" screen of `/sign-in`, after asking for a sign-in email (`auth.email-link`). For phones: the link opens in whatever browser the mail app picks, the code signs in where the person asked.
- **Who:** anyone who received the email.
- **Path:** `apps/app/src/app/sign-in/sign-in-form.tsx` (`CheckEmail`) → `authClient.signIn.emailOtp` → `POST /auth/sign-in/email-otp` → Better Auth email-otp plugin (`apps/api/src/auth/auth.ts`) → new `session` row and cookie → a full page load of the page they came from (`/me` by default).
- **Data:** reads and deletes the code's row in `verification` (identifier `sign-in-otp-<email>`, a hash of the code and the tries so far, 15 minutes); writes `user` the first time, and `session`.
- **Rules:** spec 0006. The code is created with the link, in the same email (`createVerificationOTP` inside `sendMagicLink`); only the latest email's code works, and it works once. 3 wrong tries spend it. Stored hashed. Never in the subject or the preview. Signing in with it creates the account like the link and syncs the crew role from `CREW_EMAILS`. The plugin's other routes are closed (`disabledPaths`, 404).
- **Errors:** a wrong code says so and lets them retry; an expired or spent code offers "Email me a new one"; Better Auth answers 429 after 3 requests a minute.
- **Test:** `apps/api/src/auth/sign-in-code.test.ts` (real PostgreSQL; skipped without one, as in CI).
- **Observe:** API log lines with `bit: "auth.sign-in"`; locally the email, with its code, is printed by `[Mail]`.
- **Status:** verified — 2026-11-03 (test, and in the browser: wrong code, then the right one typed as "493 086", landing on `/me`)
