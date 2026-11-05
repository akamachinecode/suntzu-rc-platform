# auth.sign-up — A visitor creates an account

- **Trigger:** a visitor fills in "Create account" on `/sign-in`.
- **Who:** anyone.
- **Path:** browser form (`apps/app/src/app/sign-in/sign-in-form.tsx`) → `authClient.signUp.email` (`apps/app/src/lib/auth-client.ts`) → Cloudflare → `POST /auth/sign-up/email` on the API → Better Auth (`apps/api/src/auth/auth.ts`) → PostgreSQL → session cookie on the parent domain → redirect to the page the visitor wanted.
- **Data:** writes `user`, `account` (hashed password) and `session` (`packages/db/src/schema/auth.ts`).
- **Rules:** a valid, unused email; a password of at least 12 characters; only the app's origin may call it (CORS and Better Auth's trusted origins).
- **Errors:** an email already in use or a short password shows Better Auth's message on the form; if the API can't be reached, the form says so.
- **Test:** none yet.
- **Observe:** API log lines with `bit: "auth.sign-up"`.
- **Status:** read in code — 2026-10-27
