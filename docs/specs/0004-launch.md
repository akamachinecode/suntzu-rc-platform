# 0004 — Launch: Servo 1.0 in Florida

- **Status:** Approved 2026-10-27
- **Requested by:** the owner (Alejandro), 2026-10-27
- **Approved by:** the owner, 2026-10-27

## Problem

Everything in specs 0001–0003 runs on a laptop. To launch, Servo needs its infrastructure in the AWS project's region, a name and a domain, the scheduled engine and emails, protection for its public forms, and the legal pages that accounts and emails require.

## Goals

- One reviewed path from a laptop to production: everything that can be prepared in code is ready, and what only the owner can do is a short, ordered checklist.
- Public forms and sign-in are protected from bots and abuse from day one.
- People know what Servo does with their data before they create an account.

## Out of scope

- A mobile app (later, on the same API).
- Paid Cloudflare plans: Free until traffic or security needs say otherwise.

## User stories

- As the owner, I want a checklist that takes Servo from "works locally" to "public", with nothing left to guess.
- As a visitor, I want to read the privacy policy and the terms before signing up.

## Capabilities touched

- **Front door:** Cloudflare in front of everything (origin lock from phase 0), Turnstile on public forms, rate-limiting rules on sign-in and API writes.
- **Processes:** the engine, resolve, alerts, digest and reports on a schedule (SST Cron running the API image as a task); S3 for engine snapshots; SES for email.
- **Operations:** costs per month, logs and alarms in `OPERATIONS.md`.
- **AWS:** everything in the project's region, `us-east-2` (C1).

## Bits

- New: `security.turnstile` — public forms check a Turnstile token in the API.
- Changed: every public form bit.

## Acceptance criteria

- When `sst.config.ts` is deployed, then every regional resource is in `us-east-2`, the scheduled jobs exist, and the API has the secrets and permissions it needs (SES, S3, Bedrock), and nothing else.
- When a public form is sent without a valid Turnstile token in production, then the API refuses it; locally, without keys, forms work.
- When someone opens `/privacy` or `/terms`, then they read in plain language what Servo stores, why, for how long and how to delete it.
- When the owner follows `docs/LAUNCH.md`, then every step says what to do, where and how to check it worked.

## Slices

- [ ] 1. Infrastructure in code: region `us-east-2`, S3 for snapshots, SES permissions, scheduled jobs, secrets and environment variables (blocked by: 0001-1, 0003-6)
- [ ] 2. Turnstile on public forms; rate-limiting rules documented for Cloudflare (blocked by: 0003-3)
- [ ] 3. Privacy policy and terms; footer links; cookie-free analytics decision (blocked by: 0003-1)
- [ ] 4. Launch checklist `docs/LAUNCH.md`; final accessibility, SEO and performance pass (blocked by: all)

## Open questions

- The final name and domain (C3) — who should answer: the owner.
- Whether the privacy policy and terms need a lawyer's review before launch — who should answer: the owner.
- SES production access (leaving the sandbox) is requested in the AWS console and takes about a day — who should do it: the owner.

## Needs Itaca engineering

- Region, scheduled jobs, S3, SES and Bedrock: approved by the owner acting as Itaca engineering, 2026-10-27. Deploying (`sst deploy`) is not part of this spec: the owner runs it from the checklist.
