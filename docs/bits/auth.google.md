# auth.google — Someone signs in with Google

- **Trigger:** "Continue with Google" on `/sign-in`, shown when the app has `NEXT_PUBLIC_GOOGLE_SIGN_IN=true`.
- **Who:** anyone with a Google account.
- **Path:** `sign-in-form.tsx` → `authClient.signIn.social({ provider: "google" })` → Google → `GET /auth/callback/google` → `session` → redirect.
- **Data:** writes `user`, `account` (provider id only), `session`.
- **Rules:** enabled only when the API has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Same role sync as the email link.
- **Errors:** Better Auth's error page.
- **Test:** none yet
- **Observe:** API log lines with `bit: "auth.callback"`.
- **Status:** not verified — 2026-10-27
