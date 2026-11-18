# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, Codex, Gemini…) working in this repository. Humans: this is also the fastest way to understand the project.

## Project

- **Name:** SunTzu RC, at **suntzurc.com** (chosen by the owner on 2026-11-03; it was "Servo" until then, see `docs/DECISIONS.md`)
- **Stack:** `app-platform` — Itaca Technologies standard stack (details below)
- **Hosting:** AWS (`terraform`) with Cloudflare in front (DNS, CDN, WAF)
- **Code:** GitHub `akamachinecode/suntzu-rc-platform` (public since 2026-11-09, renamed from `rc-landing`; the owner's personal account, not the Itaca organisation: see `docs/DECISIONS.md`, 2026-10-29)
- **Created with:** `create-itaca@0.1.0` (`web-app`) on 2026-10-20, moved to the `platform` stack (create-itaca 0.2.0, unreleased branch) on 2026-10-21, refreshed to `create-itaca@0.2.3` on 2026-10-27, migrated to `create-itaca@0.3.0` (SST → Terraform) on 2026-10-29 and moved to the new `app-platform` stack with `create-itaca@0.5.1` on 2026-11-18 (see `itaca.json`, `docs/DECISIONS.md` and `docs/specs/0011-create-itaca-0.5.1.md`)

This project follows the Itaca standard so that any Itaca engineer can take it over without surprises. Staying inside the standard matters more than any single feature.

## Who you are working with

The person prompting you may not be a developer (sales, operations, a client). So:

- Use plain language and reply in the language they write in. After each change, say what changed and how to see it (`pnpm dev`, then open the local URL).
- Don't ask them to pick libraries, frameworks or architecture — this file already decides. Ask about the business need instead (who uses it, what data, what should happen).
- If something can't be done well inside this stack (see "When to stop"), say so plainly and suggest involving Itaca engineering.

## How we work: pick the right skill first

Before acting on a request, decide what kind it is. If a skill fits, suggest it in one plain sentence (what will happen and why) and wait for a yes. You propose, you don't block: if the person says "just do it", do it and note that in the pull request. Skills live in `.claude/skills/<name>/SKILL.md`; if your tool doesn't load skills by itself, open that file and follow it.

| The request is…                                                           | Do this                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A question, or "how does X work?"                                         | Answer it. Read `docs/SYSTEM.md` and `docs/bits/` first |
| A small, clear change (a text, a colour, a link)                          | Make it, then `/ship`                                   |
| Something new, or it touches data, users, payments or an external service | `/plan` first                                           |
| Something is broken                                                       | `/fix`                                                  |
| A part of the project nobody has documented, or docs that are out of date | `/document`                                             |
| Someone else's pull request, branch or unfinished work                    | `/takeover`                                             |
| Anything on the "When to stop" list below                                 | Stop and ask Itaca engineering                          |
| The person doesn't know where to start, or asks what they can do          | `/guide`                                                |

Example: "This is a new feature and it touches user data, so I suggest doing it with /plan: I'll ask a few questions, show you the plan on one page and build it in parts once you approve it. Shall we?"

## Documentation

Every Itaca project keeps the same documents, so anyone (a person or an agent) can find their way around. Update them in the same pull request as the change they describe.

| File                                                     | What it holds                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `README.md`                                              | What the project is and how to start it                            |
| `docs/README.md`                                         | The docs portal's home page: where to start                        |
| `docs/SYSTEM.md`                                         | The map: pieces, where they run, integrations and environments     |
| `docs/DELIVERY.md`                                       | From code to production: CI, deploys, Docker, OIDC, scheduled jobs |
| `docs/guides/`                                           | Walk-throughs for newcomers: run it locally, first contribution    |
| `docs/bits/`                                             | The catalog of **bits**, one file per bit (see below)              |
| `docs/specs/`                                            | Specifications written with `/plan`, one per feature               |
| `docs/DECISIONS.md`                                      | Why things are the way they are. Read it before every task         |
| `docs/OPERATIONS.md`                                     | Running, deploying, rolling back, access, backups and secret names |
| `docs/DEPLOY.md`, `docs/CLOUDFLARE.md`, `docs/GITHUB.md` | Setup guides for hosting, domain and repository                    |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`   | How outside contributors take part; keep commands and CI in sync   |

A **bit** is the smallest piece of behaviour someone can trigger and check end to end: "a visitor sends the contact form", "an owner adds a property". Like a trace in a distributed system, it crosses every layer it touches. When a change creates or modifies a bit, create or update `docs/bits/<id>.md` (copy `docs/bits/_template.md`) and its row in `docs/bits/README.md`.

## Golden rules (non-negotiable)

1. **Keep the stack.** Never add PHP, jQuery, Bootstrap, Vue, Angular, WordPress, loose `<script>` files, another CSS framework, or another package manager. Everything is TypeScript + React + Tailwind CSS + shadcn/ui on the framework below.
2. **pnpm only.** Use `pnpm add <pkg>` / `pnpm add -D <pkg>`. Never run `npm install` or `yarn`, and never commit `package-lock.json` or `yarn.lock`. Don't relax the security settings in `pnpm-workspace.yaml`.
3. **TypeScript only**, strict mode. No new `.js` files, no `any` unless unavoidable (and commented), no `@ts-ignore` to silence errors.
4. **UI = shadcn/ui + Tailwind.** Reuse the shadcn/ui components the project already has (see "Structure" below). Need another? `pnpm dlx shadcn@latest add <component>` (catalog: https://ui.shadcn.com/docs/components — or the `shadcn` MCP server in `.mcp.json`). Style only with Tailwind classes and theme tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — no hex colors in components, no new CSS files. Brand colors and fonts live in the theme CSS variables. Icons come from `lucide-react`.
5. **No secrets in code or in git.** Read configuration from environment variables. Every new variable goes into `.env.example` (name + comment, never the real value). Real values live in `.env` locally (git-ignored) and in the hosting provider for production.
6. **Dependencies are a decision.** Prefer what the stack already includes and the "standard choices" below. Every new package must be justified in `docs/DECISIONS.md`. Packages published less than a day ago and install scripts are blocked on purpose — don't work around it.
7. **Don't touch infrastructure** — deployment files (listed under "Deployment") and `.github/` — unless the user explicitly asks. Those changes affect production.
8. **Accessible and indexable by default:** semantic HTML, one `<h1>` per page, `alt` on images, a `<label>` for every input, keyboard-usable controls, a page `title` and `description`.
9. **Finish every task with `pnpm check`** (format, lint, types, build) and fix what fails. Run `pnpm format` for formatting. Never disable lint rules or type checks to make it pass.
10. **Read and record decisions.** `docs/DECISIONS.md` is the project's memory: read it before starting a task. New dependency, environment variable, external service, data model or route structure change → add a dated entry to it. Itaca engineers read it when they take over.

## SunTzu RC project notes

- **Why SunTzu RC exists:** three RC enthusiasts want the hobby to grow, with a genuinely useful, free, well-made platform people can take part in. **`docs/LANDSCAPE.md`** has what already exists, what other hobbies teach, and the product principles that follow (free to take part, organisers get something back, visible trust, a path for newcomers). Check new features against those principles.
- **SunTzu RC 1.0** is planned in `docs/specs/0001`–`0004` (events, places, community, launch) and summarised in `docs/ROADMAP.md`: build slice by slice and tick each one off in its spec.
- **Read `docs/EVENTS-ENGINE.md`** before working on events, sources or ingestion. The plan: an engine that monitors the web for RC events (Florida first), merges duplicates, verifies them and publishes them; the worker that runs it will live in `apps/api`. **`docs/ROADMAP.md`** is the approved build order (what we index, the community ladder, tracks and milestones): tick items off there as they land.
- **Content** is typed data in `apps/app/src/content/` (services, rules, history, guides). Events and places live in the database now (the engine, the census, the crew and organisers). Every factual item carries a source link; keep it that way and re-check dates before editing.
- **Anatomy figures**: use the project skill in `.claude/skills/anatomy` (read its `SKILL.md`). The kit is vendored in `apps/app/src/components/iso/`; figures live in `apps/app/src/components/figures/<name>/` following `references/react.md`. Light theme only, XT60 yellow is the single lit accent (see `.servo-figure` in `apps/app/src/app/globals.css`). Run the line check before shipping a figure.
- **Browser support:** everything works fully in the last two years of Safari (iOS and Mac), Chrome, Firefox and Edge: Baseline "Widely available" features. Newer features are only extras that quietly do nothing where they're missing (feature-detect, `@supports`); no polyfills (`docs/DECISIONS.md`, 2026-11-17, spec 0010).
- **Accessibility:** WCAG 2.2 AA. A page change must keep `pnpm test:a11y` green (run it with the site running; CI runs it in four browsers). An axe finding is fixed in the page; only a checked false positive goes into `ACCEPTED` in `apps/app/e2e/a11y.spec.ts`, with its reason.
- **Versions:** always the latest stable release of every dependency, runtime and service. Apply security and important-fix releases promptly; release candidates and betas don't count. Major upgrades get an entry in `docs/DECISIONS.md` (see 2026-10-22).
- **Forms** (`/contact`, builds on `/community`, `/try`, `/submit`, an event's feedback) deliver to the crew's inbox at `/crew`; messages, "try it" requests no club can take and claims the crew must check are also emailed to `CREW_INBOX`. Public ones check Cloudflare Turnstile in production.
- **Accounts** have no passwords: one email with a link and a 6-digit code (spec 0006), or Google. The crew is whoever `CREW_EMAILS` lists. Locally, emails are printed in the API's console (`MAIL_TRANSPORT=log`).
- **Search** (`docs/specs/0005-search.md`): all of it lives in `apps/api/src/search/` (PostgreSQL, no extra service), the screens in `apps/app/src/components/search/` and `/search`. A ranking change must keep the golden searches in `golden.test.ts` at 36 of 36; add a pinned answer in `query.ts` rather than bending the ranking for one search.
- **Open source** (spec 0007): code under MIT (`LICENSE`), guides and figures under CC BY 4.0, the name and logo reserved (README, "Licence"). Outside pull requests are welcome: keep `CONTRIBUTING.md` true when commands, CI or the local setup change.
- **Going live** is the owner's checklist in `docs/LAUNCH.md`; don't deploy on your own.

## Commands

| Command           | What it does                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`        | Local development server                                                                                                                         |
| `pnpm build`      | Production build                                                                                                                                 |
| `pnpm check`      | Format check + lint + typecheck + bits check + unit tests + build. Must pass                                                                     |
| `pnpm check:fast` | The same without the build                                                                                                                       |
| `pnpm check:bits` | Every bit has a doc, a catalog row and a test                                                                                                    |
| `pnpm format`     | Auto-format every file (Prettier)                                                                                                                |
| `pnpm lint`       | ESLint                                                                                                                                           |
| `pnpm typecheck`  | TypeScript type checking                                                                                                                         |
| `pnpm test`       | Unit tests (Vitest), next to the code: `*.test.ts`                                                                                               |
| `pnpm test:e2e`   | End-to-end tests (Playwright), one per bit in `e2e/`. One bit: `pnpm test:e2e --grep <bit>`. First time: `pnpm exec playwright install chromium` |
| `pnpm test:a11y`  | Accessibility check of every public page (Playwright + axe-core)                                                                                 |
| `pnpm db:seed`    | Load the events engine's starting data into the local database                                                                                   |
| `pnpm engine`     | Run the events engine once (`pnpm engine <source>` for one)                                                                                      |
| `pnpm census`     | Load the FAA registers and ZIP codes (`pnpm census fria` for one)                                                                                |

## Tests

- **End-to-end, one file per bit:** `e2e/<area>.<action>.e2e.ts`, inside `test.describe("<area>.<action>", …)`. Do what the person does and check what they see: find things by role and label (`getByRole("button", { name: "Send message" })`, `getByLabel("Email")`), never by CSS classes, and never with fixed waits.
- **How they run:** `pnpm test:e2e` builds everything, then starts both apps as production builds against a database of their own (`e2e`, emptied, migrated and seeded at every start by `e2e/database.ts`), with test settings: emails land in `e2e/.mail` (`MAIL_TRANSPORT=file`, read with `e2e/mail.ts`) and `crew@example.test` is the crew, signed in once by `e2e/global-setup.ts`. Stop the dev servers first (same ports). To run them again and again without rebuilding, the owner's dekit has `suntzu-rc/e2e-api` and `suntzu-rc/e2e-app`, and then `pnpm exec playwright test --config e2e/playwright.config.ts --grep <bit>`.
- **People and data:** sign people in as a person does, with the code from their email (`signIn`, `signedIn` in `e2e/people.ts`); every test uses its own new address. The crew adds events by hand (`addEvent`), members become organisers (`becomeOrganiser`) and jobs run against the test database (`runJob`), all in `e2e/data.ts`. Tests never call the internet: the readers of the web (the engine, the census) are proved by their unit tests on saved pages.
- **Someone's data:** add the cases "another member can't see or change it" and "signed out can't". They're the most valuable tests in the project.
- **Unit tests** go next to the code (`*.test.ts`, Vitest) for rules and calculations. When a rule must hold for any input (reading back what you saved gives the same thing, a date range never ends before it starts), write a **property test** with `fast-check` (see `packages/shared/src/rules.test.ts`).
- Tests use made-up data only (`@example.test` addresses), never real people's data or production.
- `pnpm test:a11y` is separate: accessibility, motion and speed checks of every public page, against the running site (`apps/app/e2e`).

## Stack: product platform with a Next.js site (`app-platform`)

A pnpm monorepo: one Next.js app that is both the public website and the private area, on top of one API, ready for a mobile app. SunTzu RC's public pages are the product (dynamic events, SEO per event, interactive figures), which is what `app-platform` is for. Each app and package has its own `AGENTS.md` with its stack, structure and recipes — **read it before changing files there.**

```text
apps/app/             website and application: Next.js 16 (App Router), UI only  → https://www.suntzurc.com
apps/api/             backend: NestJS — auth, business rules, data            → https://api.suntzurc.com
apps/docs/            docs portal: Fumadocs, built from docs/ (static, GitHub Pages)
packages/db/          database schema and migrations (PostgreSQL + Drizzle), used only by apps/api
packages/shared/      validation schemas (Zod) and types shared by the API and the apps
packages/api-client/  typed API client, generated from apps/api/openapi.json
packages/ui/          shared shadcn/ui components + theme (brand colors, radius)
```

### Which app?

- **`apps/api`** — every business rule and every piece of data: who can see what, what happens when something is created, payments, emails, scheduled work. A future mobile app will use the same API, so nothing that matters may live only in the web app.
- **`apps/app`** — every screen, public or private. Public pages (home, guides, events, places, clubs, community, sign-in, legal) go in `apps/app/src/app/(site)/`; pages for signed-in members (My SunTzu RC, the crew console, an organiser's club) go in `apps/app/src/app/(app)/` and in `src/proxy.ts`. It reads and writes data only through the API (`getApi()` in `apps/app/src/lib/api.ts`).
- When unsure, ask the user: "Can anyone see this without signing in?" Yes → `(site)`. No → `(app)`. And: "Should this also work in a mobile app or for another system?" Yes → the rule goes in `apps/api`.

### How a feature is built (end to end)

1. **Schema:** add or change tables in `packages/db/src/schema/`, then `pnpm db:generate` (writes a SQL migration) and `pnpm db:migrate`.
2. **Contract:** add the request/response schemas to `packages/shared`.
3. **API:** add a module in `apps/api/src/<domain>/` (controller + service), copying `apps/api/src/notes/`. Data that anyone may see (a public listing) uses `@Public()` on its route; everything else needs a signed-in user.
4. **Client:** `pnpm build` regenerates `apps/api/openapi.json` and the typed client. Commit both with the change.
5. **Screen:** add the page in `apps/app/src/app/(app)/` (private, copying `(app)/notes/`) or `apps/app/src/app/(site)/` (public).
6. **Tests:** the bit's doc in `docs/bits/` and its end-to-end test in `e2e/<bit>.e2e.ts`, through the screen and, for the rules, straight against the API; copy `e2e/notes.get.e2e.ts` for the "another member gets 404" and "signed out gets 401" cases.

### Monorepo rules

- **Run commands from the repository root.** First time: `pnpm db:up && pnpm db:migrate` (local PostgreSQL in Docker), copy each app's `.env.example` to `.env`. Then `pnpm dev` starts everything (site and app http://localhost:3000, API http://localhost:3001, API docs http://localhost:3001/docs). `pnpm check` checks everything.
- **Dependencies belong to one app or package:** `pnpm --filter @workspace/api add <pkg>` (or `@workspace/app`…). Never `pnpm add` at the root (only shared tooling such as Prettier lives there).
- **UI components live in `packages/ui`** and are shared by every app (a future mobile app uses its own UI kit). Import them as `@workspace/ui/components/<name>`. Add a new one from the app that needs it: `cd apps/app && pnpm dlx shadcn@latest add <component>`.
- **One theme:** brand colors, fonts and radius are CSS variables in `packages/ui/src/styles/globals.css`.
- Never import code from one app into another. Shared code goes into a package under `packages/` — ask Itaca engineering before creating one.
- **The API contract is reviewed like code.** A change to `apps/api/openapi.json` in a pull request means web and mobile clients may need to change too.

## Deployment (AWS via Terraform)

- Infrastructure lives in `infra/` (Terraform); deploys run from `.github/workflows/deploy.yml` when `main` changes. See `docs/DEPLOY.md` and `docs/TERRAFORM.md`.
- Don't edit `infra/` or the workflows, and don't run `terraform apply` / `terraform destroy`, unless the user explicitly asks — they change real AWS resources and cost money. After editing `infra/`, run `terraform fmt -recursive infra` and `terraform -chdir=infra validate` (after `terraform -chdir=infra init -backend=false` once).
- Scheduled jobs (engine, notify, census) and the one-off `setup` live in `infra/jobs.tf`; run one by hand from **Actions → Run a task** (`.github/workflows/task.yml`).
- New environment variables: add them to `.env.example`, and tell the user they must also be configured for production (see `docs/DEPLOY.md`, "Secrets and configuration").

## Git & GitHub

- `main` is production: what is merged there gets deployed.
- Work on a branch (`feat/contact-form`, `fix/footer-links`) and open a Pull Request. CI (`.github/workflows/ci.yml`) must be green before merging.
- Commit messages follow Conventional Commits: `feat: add pricing page`, `fix: broken footer link`, `chore: update dependencies`.
- Never commit `.env` files, credentials, `node_modules/` or build output.

## When to stop and ask Itaca engineering

- Payments, personal or sensitive data, user roles and permissions, regulated data (HIPAA, PCI DSS, GDPR, SOC 2 scope).
- Integrations with other company systems (ERP, CRM, identity providers, internal APIs).
- Changes to infrastructure, DNS, domains, AWS or Cloudflare settings.

- **Database structure changes that delete or rename data** (dropping columns or tables, changing types) and anything touching user accounts, sessions or permissions in `apps/api/src/auth`.
- **Background jobs, queues, scheduled tasks, websockets or file uploads:** they need new AWS pieces in `infra/` (Terraform) — ask Itaca engineering.
- **Alarms, alert recipients and tracing** (`alerts` in `infra/<stage>.tfvars.json`, `infra/modules/alerts`, `apps/api/src/otel.ts`, `apps/app/src/instrumentation*.ts`): turning one off can leave production unwatched. Adding a recipient is fine.

Explain to the user why the request needs an engineer, write down what you found in `docs/DECISIONS.md`, and don't improvise a workaround.

## AWS account

- SunTzu RC runs in AWS account `352587389937` (project `suntzu-rc`), in **us-east-2**. It was created with AWS's new sign-up experience and has had **advanced features active** since 2026-11-10 (`docs/DECISIONS.md`): the owner administers the organization and its policies, and there is no spend limit.
- CLI profiles on the owner's machines: `suntzu-rc-admin` (full access, `aws login --profile suntzu-rc-admin`) and `suntzu-rc-read-only` (role `AgentReadOnly`). **Use the read-only profile to look around**; the admin profile only for a change the owner asked for.
- An organization policy still limits where resources can be created: **us-east-2**, plus global services, CloudWatch and SNS in us-east-1 (the uptime alarms live there). Don't create anything in another Region; a refused call there is that policy, not a bug.
- Deploying is the owner's step, following `docs/LAUNCH.md`.
