# 0011 — The Itaca standard `create-itaca@0.5.1`: the `app-platform` stack, a test per bit, verified changes

- **Status:** Approved 2026-11-18
- **Requested by:** the owner (Alejandro), 2026-11-18: "update the stack and migrate the whole site to it, on your own, without me"
- **Approved by:** the owner, 2026-11-18 (the request itself: no decisions to be asked back; the agent acts as Itaca engineering until the first version is done)

## Problem

The owner published `create-itaca@0.5.1` (tag `v0.5.1` of `itaca-stacks`, 2026-11-17). SunTzu RC follows the standard from `0.3.1` plus the observability of `0.4.0` (2026-11-05), so it misses three things:

- **A stack of its own.** `0.5.0` adds `app-platform`: `platform` without Astro, one Next.js app that is both the public site (`src/app/(site)`) and the private area (`src/app/(app)`). That is what SunTzu RC has been since 2026-10-21, as a documented deviation; now it's the standard.
- **Proof instead of descriptions.** Every bit gets an end-to-end test, and `pnpm check` fails when one is missing. Today 48 bits are documented and about a third have a test.
- **Verified changes.** `/verify` and `/security`, a commit gate that only lets verified files through, the checks a diff triggers (`docs/CHECKS.md`), a review guide, Semgrep in CI and a code owner for the files that judge every change.

Plus the security release in between (`0.4.1`): Next.js 16.4.6.

## Goals

- `itaca.json` says `app-platform`, and the code has the stack's shape: public pages in `(site)`, the private area in `(app)`, the same URLs as before.
- Every bit has a test that proves it, `pnpm check:bits` passes, and `pnpm test:e2e` runs one end-to-end test per bit against production builds with a throwaway database.
- An agent working here follows the "Definition of done": `/verify` before a commit, `Verified-by:` on every commit, `/security` when a change touches sign-in, data or permissions.
- CI runs the end-to-end tests, Semgrep and the stamps list on every pull request.
- Every dependency at its latest stable release, except the ones kept on purpose (TypeScript 5.9 and `@types/node` 24, see 2026-11-03).

## Out of scope

- **Deploying.** Going live stays with the owner (`docs/LAUNCH.md`); nothing here is applied to AWS.
- **The GitHub ruleset.** Requiring the new checks and code owner review is a repository setting: `docs/GITHUB.md` has the command for the owner to run after merging.
- **Changing what the site does or looks like.** The private area keeps the site's header and footer (see "Decisions").
- **TypeScript 7 and `@types/node` 26** (Dependabot #9 and #10): still outside the template.

## Decisions (taken by the agent, at the owner's request)

- **One header for both areas.** The template gives `(app)` its own header with "Sign out". SunTzu RC's members move between public pages and their own all the time, and the account button already lives in the site header, so both route groups use the same frame (`components/site-frame.tsx`). What `(app)` adds is that its pages are never indexed.
- **Routes that aren't pages stay at the root of `src/app`:** the clubs' widget (`/embed`), the private calendar feed (`/calendar`), `/api/*`, the sitemap, `robots.txt`, the manifest and the 404 page.
- **The end-to-end tests own their data.** They run against a database of their own (`e2e`, next to the local `app`), migrated and seeded at start, and every test signs up its own people. Emails land in a folder the tests read (`MAIL_TRANSPORT=file`), so sign-in is tested as a person does it: the email, then the code or the link.
- **Jobs and readers of the web** (the engine, the census) are proved by the tests that run their code on saved copies of real pages and files, not by calling the internet from CI.
- **Three pull requests**, stacked: the stack, the tests, the checks. A change never edits its own checks (`AGENTS.md`), so the third carries every file under `.claude/` and `.github/`.

## Capabilities touched

- **Processes:** emails get a third transport, `file`, for tests only.
- **Operations:** CI gets three jobs (end-to-end tests, Semgrep, stamps). No AWS change.

## Bits

- Changed: every bit gets its test (`docs/bits/`).
- New: none.

## Acceptance criteria

- When someone opens any page that worked before, then it works at the same URL, with the same header and footer.
- When `pnpm check` runs, then it fails if a bit has no doc, no catalog row or no test.
- When `pnpm test:e2e` runs on a computer with Docker, then it builds, starts both apps against a fresh `e2e` database and every bit's test passes.
- When an agent commits files it didn't verify, then the commit is stopped with a message saying what to do.
- When a pull request is opened, then CI shows the end-to-end tests, Semgrep and how each commit was verified.

## How we'll verify

- `pnpm check`, `pnpm test:e2e` and `pnpm test:a11y` locally, and CI on each pull request.
- Every public page opened in a browser after the move to route groups, signed out and signed in.
- The commit gate tried on a real commit of this work.

## Slices

- [x] 1. The stack: `app-platform`, route groups, versions, infra catch-up, docs (blocked by: —)
- [x] 2. A test per bit: `e2e/`, `pnpm check:bits`, `pnpm test:e2e`, the mailbox, every bit tested (blocked by: 1)
- [ ] 3. The checks: `/verify`, `/security`, hooks, `docs/CHECKS.md`, `REVIEW.md`, CI, code owners (blocked by: 2)

## Open questions

- None: the owner asked for no questions until the first version is done. What needs the owner after merging is listed in each pull request.

## Needs Itaca engineering

- Yes, acted on by the agent at the owner's request: `.github/` and `.claude/` (slice 3), `infra/` version and comment changes (slice 1). Nothing is applied to AWS or to GitHub's settings.
