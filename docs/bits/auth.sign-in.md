# auth.sign-in — A user signs in

- **Trigger:** a user submits "Sign in" on `/sign-in`, or opens a private page without a session and is sent there by `apps/app/src/proxy.ts`.
- **Who:** anyone with an account.
- **Path:** browser form → `authClient.signIn.email` → Cloudflare → `POST /auth/sign-in/email` on the API → Better Auth checks the password → new row in `session` → session cookie → redirect.
- **Data:** reads `user` and `account`; writes `session`.
- **Rules:** sessions are stored in the database, so they can be revoked. The cookie is shared by the app and the API through the parent domain (`COOKIE_DOMAIN`).
- **Errors:** wrong email or password shows a generic message.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "auth.sign-in"`.
- **Status:** read in code — 2026-10-27
