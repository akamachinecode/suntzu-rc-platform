# auth.email-link — Someone signs in with a link by email

- **Trigger:** "Email me a sign-in link" on `/sign-in` (also how a new account is created).
- **Who:** anyone with an email address.
- **Path:** `apps/app/src/app/sign-in/sign-in-form.tsx` → `authClient.signIn.magicLink` → `POST /auth/sign-in/magic-link` → Better Auth magic-link plugin (`apps/api/src/auth/auth.ts`) → `sendMail` (`apps/api/src/mail/mail.ts`, SES or the console) → the person opens `GET /auth/magic-link/verify?token=…` → new `session` row and cookie → redirect to the page they came from (`/me` by default).
- **Data:** reads and writes `user`, `verification` (the one-time token, 15 minutes), `session`.
- **Rules:** no passwords (owner, 2026-10-27). The link works once. At every sign-in the role is synced from `CREW_EMAILS` (`crew` or `member`). Only redirects inside the site (`APP_URL`).
- **Errors:** an invalid or used link shows Better Auth's error page; a send failure shows "Something went wrong".
- **Test:** none yet
- **Observe:** API log lines with `bit: "auth.sign-in"` and `"auth.magic-link"`; locally the email is printed by `[Mail]`.
- **Status:** verified — 2026-10-27
