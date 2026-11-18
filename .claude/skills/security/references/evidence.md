# Where this project implements each control

Written by the template for this stack and deployment target. It's a map, not proof: open each file, confirm it still does what's described, and check the change doesn't go around it. When a control moves, update this file in its own pull request (it's under `.claude/`, reviewed by Itaca engineering).

## Every project

- **P0-04 secrets:** `.gitignore` ignores `.env` files; `.github/workflows/ci.yml` runs TruffleHog on every push (job "Secret scan").
- **P0-16 supply chain:** `pnpm-workspace.yaml` (versions at least a day old, no trust downgrades, install scripts blocked, exceptions with reasons); `pnpm-lock.yaml` committed; `.github/dependabot.yml`; `.github/workflows/ci.yml` (job "Dependency audit").
- **P1-02 analysis:** `.github/workflows/ci.yml` (jobs "Secret scan", "Dependency audit", "Static analysis" with Semgrep).
- **P1-01 repository:** `.github/CODEOWNERS`; the ruleset command in `docs/GITHUB.md`.
- **P1-10 CI:** `.github/workflows/ci.yml` (`permissions: contents: read`, actions pinned by SHA, `persist-credentials: false`, `pull_request` only).
- **P0-15 tests:** end-to-end tests in `e2e/`, one per bit (`pnpm check:bits`).

## This platform (API, app)

- **P0-01 authentication:** `apps/api/src/auth/auth.ts` (Better Auth, no passwords: one email with a one-time link and a 6-digit code, stored hashed, 15 minutes, 3 tries; or Google when it's set up; sessions in the database). The app only talks to it through `apps/app/src/lib/auth-client.ts`; the code only lands on this site (`apps/app/src/lib/safe-next.ts`).
- **P0-02 authorization:** `apps/api/src/auth/auth.guard.ts` (global `AuthGuard`: every route needs a session unless it is `@Public()`; `@CrewOnly()` for the crew, whose role is synced from `CREW_EMAILS` at every sign-in and never set from a request; `@CurrentUser()` comes from the verified session). `apps/app/src/proxy.ts` only redirects; the API is the gate.
- **P0-03 isolation:** members' data is scoped to the caller in `apps/api/src/members/members.service.ts` (follows, going, settings, the private calendar by its secret token) and `apps/api/src/notes/notes.service.ts` (a foreign note answers 404); organisers reach only the clubs they're verified for (`organisedHost` in `apps/api/src/organise/organise.service.ts`; another club's event or place answers 404).
- **P0-05 input:** `apps/api/src/common/zod.ts` (`ZodPipe`) with the schemas in `packages/shared/src/` (links people type are `z.httpUrl()`, http(s) only); Drizzle builds the queries. Links people give us are fetched only on the public internet (`apps/api/src/events/engine/fetcher.ts`).
- **P0-08 abuse:** public forms check Cloudflare Turnstile in production (`apps/api/src/common/turnstile.ts`, `apps/app/src/components/turnstile.tsx`); per-member limits on corrections and submitted events (`apps/api/src/inbox/inbox.service.ts`, `apps/api/src/submissions/submissions.service.ts`); Cloudflare rate-limit rules for sign-in (`docs/LAUNCH.md`).
- **P0-04 secrets:** `apps/api/src/env.ts` and `apps/app/src/lib/env.ts` (validated, server-only).
- **P0-12 configuration:** `apps/api/src/app.ts` (CORS only for `APP_URL`, with credentials); `apps/app/next.config.ts` (security headers, a Content-Security-Policy in report-only mode, no framing except the clubs' widget).
- **P0-13 CSRF:** Better Auth's `trustedOrigins` in `apps/api/src/auth/auth.ts`; Server Actions check the origin.
- **P0-15 tests:** one end-to-end test per bit in `e2e/`; the ones with someone's data include "another member can't" and "signed out can't" (for example `e2e/notes.get.e2e.ts`, `e2e/organiser.publish.e2e.ts`, `e2e/crew.inbox.e2e.ts`, `e2e/me.calendar.e2e.ts`).
- **P2-08 containers:** `apps/api/Dockerfile` and `apps/app/Dockerfile` run as a non-root `USER`.

## Deployment (Terraform on AWS, Cloudflare in front)

- **P0-07 HTTPS and P0-12 at the edge:** Cloudflare in front (`docs/CLOUDFLARE.md`); `infra/origin-lock.tf` makes the origin accept only traffic that came through Cloudflare once the secret header is set.
- **P0-10 least privilege:** `.github/workflows/deploy.yml` deploys with GitHub OIDC (`id-token: write`, a role per project, no stored AWS keys; `docs/AWS-GITHUB-OIDC.md`).
- **P1-04 deployments:** only from `.github/workflows/deploy.yml`; rollback in `docs/OPERATIONS.md`.

- **P0-09 database:** `infra/modules/database/main.tf` (`publicly_accessible = false`, `storage_encrypted = true`, credentials in SSM).
- **P1-06 monitoring:** alarms with runbooks in `docs/OPERATIONS.md` ("Monitoring").
- **P1-07 backups:** `infra/modules/database/main.tf` (`backup_retention_period`, `deletion_protection`); a restore test is `UNVERIFIED` until it's dated in `docs/OPERATIONS.md`.
