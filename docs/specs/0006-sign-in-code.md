# 0006 — A sign-in code next to the link

- **Status:** Approved 2026-11-03
- **Requested by:** the owner (Alejandro), 2026-11-03
- **Approved by:** the owner, 2026-11-03, acting as Itaca engineering (accounts)

## Problem

On a phone, the sign-in link opens wherever the mail app decides. Someone asks for a link in Safari, taps it in the Gmail app, and the session lands in Gmail's own browser: back in Safari they are still signed out, and asking again sends them round the same loop. Phones are where most people will check this weekend's events, so this is the first sign-in most members will try.

## Goals

- Someone who asked for a sign-in email on one screen can sign in **on that same screen**, whatever app opens their email.
- Still no passwords (owner, 2026-10-27, confirmed 2026-11-03), and still one email per request.
- Guessing a code is not a way in.

## Out of scope

- Passwords: not now, not as an option (owner, 2026-11-03).
- Passkeys (Face ID, fingerprint): later, once members come back often.
- Sign in with Apple: only if many members use iPhones; it needs a paid Apple developer account.
- Changing Google sign-in or how accounts, roles and sessions work.

## User stories

- As a pilot on my phone, I want to type the code from the email on the page where I asked, so that I'm signed in in the browser I'm using.
- As a pilot on a computer, I want the button in the email to keep working, so that nothing changes for me.
- As a member, I want a mistyped code to tell me what to do next, so that I'm never stuck.

## Capabilities touched

- **Identity:** a second way to finish the same email sign-in (Better Auth's `emailOTP` plugin, part of `better-auth`, no new dependency). New accounts are still created by the first sign-in, and the crew role is still synced at every sign-in.
- **Data:** the code is kept in the existing `verification` table, hashed, for 15 minutes. No new tables or fields.
- **Processes:** the sign-in email gains the code; still one email per request.
- **Front door:** the new `POST /auth/sign-in/email-otp` is public, limited by Better Auth to 3 requests a minute; the Cloudflare rule on the magic-link route (`LAUNCH.md`, step 3) should cover it too.

## Bits

- Changed: `auth.email-link` — the email carries a 6-digit code next to the button.
- New: `auth.email-code` — someone signs in by typing the code from the email.

## Acceptance criteria

- When someone asks for a sign-in email, then exactly one email arrives with the button and a 6-digit code, and neither the subject nor the preview shows the code.
- When they type that code on the "Check your email" screen within 15 minutes, then they are signed in in that browser and land on the page they came from (`/me` by default).
- When they tap the button instead, then sign-in works as it does today.
- When the code is wrong, then the screen says so and lets them try again; after 3 wrong tries the code stops working and the screen offers "Email me a new one".
- When the code is older than 15 minutes, then it is refused with the same "Email me a new one" offer.
- When someone signs in with the code for an address that has no account, then the account is created, as with the link.
- When a crew address signs in with the code, then it gets the crew role, as with the link.
- When anyone calls the plugin's other routes (send a code without a link, verify an email, reset a password, change an email), then they are refused.
- The code field works with the keyboard and screen readers, has a label, and offers the phone's one-time-code autofill.

## Slices

- [x] 1. The code in the email, the code field on "Check your email", the unused routes closed, the bits updated (blocked by: —)

## Open questions

- None. Decided by the owner on 2026-11-03: 15 minutes, as the link; not in the subject (someone who sees a locked phone could use it); after 3 wrong tries, ask for a new email.

## Needs Itaca engineering

- Yes, by the "When to stop" list (accounts and sessions in `apps/api/src/auth`). The owner approves it acting as Itaca engineering, as with spec 0003; the pre-launch review of `apps/api/src/auth/` recommended on 2026-10-27 should include it.
