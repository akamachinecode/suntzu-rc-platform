# Checks triggered by a change

A short list of things that went wrong before (here or in other Itaca projects), each one written so it can be spotted from a diff. `/verify` reads the list **from `main`** (`git show origin/main:docs/CHECKS.md`), finds the items whose **Trigger** matches the change and runs only those, usually a handful. The tests and `pnpm check` cover the rest.

How to use and keep it:

- **Trigger**: something you can see in the diff (a path, a new file, a word).
- **Check**: what to verify, concretely, and how.
- **Why**: the incident, pull request or rule behind it, so nobody has to guess.
- **Changing this file:** in its own pull request, never in the change it would judge, reviewed by Itaca engineering (`.github/CODEOWNERS`). When `/fix` finds a bug a check could have caught from the diff, it proposes an item here. Items nobody has needed for a year get removed.

## Every project

### C-01 · New environment variable

- **Trigger:** a new `process.env.X`, `import.meta.env.X` or a new entry in an `env.ts` schema.
- **Check:** it is in `.env.example` (name and a comment, never the value) and validated in the project's `env.ts`; anything secret is server-only (never `NEXT_PUBLIC_*` or `PUBLIC_*`); `docs/DECISIONS.md` says where production gets it.
- **Why:** golden rule 5. A variable missing in production breaks the deploy or, worse, the feature silently.
- **Added:** 2026-11-18

### C-02 · New dependency

- **Trigger:** a new entry in any `package.json` `dependencies` or `devDependencies`.
- **Check:** `docs/DECISIONS.md` justifies it; the stack didn't already have something that does the job; `pnpm-workspace.yaml` was not relaxed to install it.
- **Why:** golden rule 6. Every package is code we run and must keep up to date.
- **Added:** 2026-11-18

### C-03 · New or changed behaviour

- **Trigger:** a new page, route, form, Server Action or API endpoint, or a changed one.
- **Check:** its bit has a doc in `docs/bits/`, a row in the catalog and an end-to-end test that does what a person would do; the test fails without the change. `pnpm check:bits` passes and `pnpm test:e2e --grep <bit>` is green.
- **Why:** a feature without a test is a feature nobody can safely change later.
- **Added:** 2026-11-18

### C-04 · Someone's data

- **Trigger:** code that reads or writes data that belongs to a user or a customer.
- **Check:** the end-to-end test includes "another member can't see or change it" and "signed out can't"; `/security` sign-off ran.
- **Why:** the most common serious bug in web apps (OWASP API1: broken object level authorization).
- **Added:** 2026-11-18

### C-05 · CI or workflows

- **Trigger:** any change under `.github/`.
- **Check:** actions pinned to a full commit SHA with the version in a comment; `permissions:` as small as possible; `persist-credentials: false` on checkout; no `pull_request_target`; no secret printed. Itaca engineering reviews it.
- **Why:** a workflow runs with the repository's access; a careless one leaks it.
- **Added:** 2026-11-18

### C-06 · A test was removed or weakened

- **Trigger:** a deleted test, `.skip`, `.only`, a new `retries`, `waitForTimeout`, a lowered limit, or a disabled lint rule.
- **Check:** there's a written reason in the pull request (and in `docs/DECISIONS.md` for a deleted test); the behaviour it covered is still covered or deliberately dropped.
- **Why:** making a check pass by weakening it hides the bug it found.
- **Added:** 2026-11-18

## This platform

### C-10 · New or changed API route

- **Trigger:** a new or changed route in `apps/api/src/**/*.controller.ts`.
- **Check:** it has `@Bit("area.action")` and that bit has a doc; it validates its input with `ZodPipe` and a schema from `@workspace/shared`; it is **not** `@Public()` unless anyone on the internet may call it, and crew routes have `@CrewOnly()`; it reads the caller from `@CurrentUser()`, never from the request body; `apps/api/openapi.json` and the API client were regenerated (`pnpm build`) and committed.
- **Why:** the API is the only gate to the data; the app and a future mobile app trust it.
- **Added:** 2026-11-18

### C-11 · A query on someone's data

- **Trigger:** a Drizzle query on a member's or a club's data in `apps/api` (follows, going, settings, notes, an organiser's club, its events and places).
- **Check:** it is scoped to the caller (`eq(table.userId, user.id)`, `organisedHost(user, slug)` for a club, or the rule in the bit's doc), and a foreign or unknown ID answers 404, not 403; the end-to-end test has the "another member gets 404" case.
- **Why:** OWASP API1, broken object level authorization: changing an ID in a request must never reveal someone else's data.
- **Added:** 2026-11-18

### C-12 · Database migration

- **Trigger:** a new file in `packages/db/migrations/` or a change in `packages/db/src/schema/`.
- **Check:** it is a **new** migration (merged ones are never edited); a new table that belongs to members has an indexed `user_id` that cascades on delete (account deletion removes it); it doesn't drop or rename a column or table (that's "stop and ask"); `pnpm db:migrate` runs on an empty and on an existing local database (`pnpm test:e2e` does the empty one).
- **Why:** production data can't be rebuilt; a broken migration stops the deploy.
- **Added:** 2026-11-18

### C-13 · Sign-in, sessions or permissions

- **Trigger:** any change in `apps/api/src/auth/`, `apps/app/src/proxy.ts`, `apps/app/src/lib/safe-next.ts` or the sign-in pages (`apps/app/src/app/(site)/sign-in/`).
- **Check:** stop and ask Itaca engineering before merging (AGENTS.md); the `auth.*` end-to-end tests pass.
- **Why:** a mistake here exposes every account.
- **Added:** 2026-11-18

### C-14 · Alarms, alerts or tracing

- **Trigger:** a change in `infra/` alarms, alert recipients or the OpenTelemetry setup.
- **Check:** every alarm still links its runbook in `docs/OPERATIONS.md`; nothing is left unwatched; Itaca engineering reviews it.
- **Why:** turning one off can leave production unwatched without anyone noticing.
- **Added:** 2026-11-18

## SunTzu RC

### C-30 · Search ranking

- **Trigger:** a change in `apps/api/src/search/` (`search.ts`, `query.ts`) or in the search index's SQL (`packages/db/migrations/*search*`).
- **Check:** the golden searches stay at 36 of 36 (`pnpm --filter @workspace/api test src/search`, needs `pnpm db:up`); a single search is fixed with a pinned answer in `query.ts`, not by bending the ranking; `e2e/search.query.e2e.ts` passes.
- **Why:** `AGENTS.md` (spec 0005); on 2026-11-18 a stale word list hid new events' names for up to 5 minutes.
- **Added:** 2026-11-18

### C-31 · A page or a form changed

- **Trigger:** a change in `apps/app/src/app/**/page.tsx`, a layout, `apps/app/src/components/`, or a form.
- **Check:** `pnpm test:a11y` passes with the site running (WCAG 2.2 AA); a form keeps what was typed after an error, shows each error at its field and uses `noValidate` with `components/forms/feedback.tsx`; a select or radio group whose default comes from saved data has a `key` from that value.
- **Why:** `AGENTS.md` (spec 0010); on 2026-11-18 the club form lost what was typed and "Who can use it" showed the old answer after saving.
- **Added:** 2026-11-18

### C-32 · Reading the API's answer in the app

- **Trigger:** a Server Action or page that shows a message from an API error, or `response.json()` / `response.clone()` on an API response in `apps/app`.
- **Check:** the message comes from the typed client's `error` (`apiErrorText(result, fallback)`, `apps/app/src/lib/api-error.ts`), never from reading the response body again, and only for 4xx answers.
- **Why:** on 2026-11-18 every refused claim, code and publish showed a generic message: the body had already been read by the client.
- **Added:** 2026-11-18

### C-33 · A public form

- **Trigger:** a new or changed form that anyone can send without signing in, or a public `POST` route.
- **Check:** the form renders `<Turnstile />` inside it and sends its token; the API calls `checkTurnstile`; the bit's test sends it end to end (Turnstile is off in tests, so read the code for the token).
- **Why:** on 2026-11-18 the event feedback widget sent no token, so in production every answer would have been refused.
- **Added:** 2026-11-18

### C-34 · Links, dates and redirects people give us

- **Trigger:** a new field that holds a link, a date shown for an event, or a redirect built from a query parameter (`?next=`).
- **Check:** links are `z.httpUrl()` (http(s) only); event dates are compared in the event's own time zone (`dateIn` in `apps/app/src/lib/events.ts`), not UTC; redirects go through `safeNext`.
- **Why:** spec 0010: `javascript:` links were accepted, events looked over at 7 pm in Florida, and `/sign-in?next=/\evil.com` could leave the site.
- **Added:** 2026-11-18

### C-35 · Facts in the content

- **Trigger:** a change in `apps/app/src/content/` (guides, rules, history, services).
- **Check:** every factual item keeps its source link, and dates were checked again against the source.
- **Why:** `AGENTS.md`, "Content": SunTzu RC is trusted because it says where each fact comes from.
- **Added:** 2026-11-18

## Infrastructure (Terraform)

### C-20 · Infrastructure change

- **Trigger:** any change under `infra/` or `.github/workflows/deploy.yml` / `infra.yml`.
- **Check:** `terraform fmt -recursive infra` and `terraform validate` pass; no secret values in `.tf` or `.tfvars` (only SSM parameter names); IAM keeps the smallest permissions; the person asked for it explicitly (golden rule 7); Itaca engineering reviews it.
- **Why:** these files change production directly.
- **Added:** 2026-11-18
