# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, Codex, Gemini…) working in this repository. Humans: this is also the fastest way to understand the project.

## Project

- **Name:** SunTzu RC, at **suntzurc.com** (chosen by the owner on 2026-11-03; it was "Servo" until then, see `docs/DECISIONS.md`)
- **Stack:** `platform` — Itaca Technologies standard stack (details below)
- **Hosting:** AWS (`terraform`) with Cloudflare in front (DNS, CDN, WAF)
- **Code:** GitHub `akamachinecode/suntzu-rc-platform` (public since 2026-11-09, renamed from `rc-landing`; the owner's personal account, not the Itaca organisation: see `docs/DECISIONS.md`, 2026-10-29)
- **Created with:** `create-itaca@0.1.0` (`web-app`) on 2026-10-20, moved to the `platform` stack (create-itaca 0.2.0, unreleased branch) on 2026-10-21 refreshed to `create-itaca@0.2.3` on 2026-10-27 and migrated to `create-itaca@0.3.0` (SST → Terraform) on 2026-10-29 (see `itaca.json` and `docs/DECISIONS.md`)

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
- **Versions:** always the latest stable release of every dependency, runtime and service. Apply security and important-fix releases promptly; release candidates and betas don't count. Major upgrades get an entry in `docs/DECISIONS.md` (see 2026-10-22).
- **Forms** (`/contact`, builds on `/community`, `/try`, `/submit`) deliver to the crew's inbox at `/crew` (and by email to `CREW_INBOX`); public ones check Cloudflare Turnstile in production.
- **Accounts** have no passwords: one email with a link and a 6-digit code (spec 0006), or Google. The crew is whoever `CREW_EMAILS` lists. Locally, emails are printed in the API's console (`MAIL_TRANSPORT=log`).
- **Search** (`docs/specs/0005-search.md`): all of it lives in `apps/api/src/search/` (PostgreSQL, no extra service), the screens in `apps/app/src/components/search/` and `/search`. A ranking change must keep the golden searches in `golden.test.ts` at 36 of 36; add a pinned answer in `query.ts` rather than bending the ranking for one search.
- **Open source** (spec 0007): code under MIT (`LICENSE`), guides and figures under CC BY 4.0, the name and logo reserved (README, "Licence"). Outside pull requests are welcome: keep `CONTRIBUTING.md` true when commands, CI or the local setup change.
- **Going live** is the owner's checklist in `docs/LAUNCH.md`; don't deploy on your own.

## Commands

| Command          | What it does                                                      |
| ---------------- | ----------------------------------------------------------------- |
| `pnpm dev`       | Local development server                                          |
| `pnpm build`     | Production build                                                  |
| `pnpm check`     | Format check + lint + typecheck + tests + build. Must pass        |
| `pnpm format`    | Auto-format every file (Prettier)                                 |
| `pnpm lint`      | ESLint                                                            |
| `pnpm typecheck` | TypeScript type checking                                          |
| `pnpm test`      | Unit tests (Vitest)                                               |
| `pnpm db:seed`   | Load the events engine's starting data into the local database    |
| `pnpm engine`    | Run the events engine once (`pnpm engine <source>` for one)       |
| `pnpm census`    | Load the FAA registers and ZIP codes (`pnpm census fria` for one) |

## Stack: product platform (`platform`)

A pnpm monorepo: one Next.js app (the public site and the signed-in screens) on top of one API, ready for a mobile app. Unlike the standard `platform` stack there is no Astro site (`apps/web`): SunTzu RC's public pages are the product (dynamic events, SEO per event, interactive figures), so they live in `apps/app`. Each app and package has its own `AGENTS.md` with its stack, structure and recipes — **read it before changing files there.**

```text
apps/app/             public site + web app: Next.js 16 (App Router), UI only    → https://www.suntzurc.com
apps/api/             backend: NestJS — auth, business rules, data            → https://api.suntzurc.com
apps/docs/            docs portal: Fumadocs, built from docs/ (static, GitHub Pages)
packages/db/          database schema and migrations (PostgreSQL + Drizzle), used only by apps/api
packages/shared/      validation schemas (Zod) and types shared by the API and the apps
packages/api-client/  typed API client, generated from apps/api/openapi.json
packages/ui/          shared shadcn/ui components + theme (brand colors, radius)
```

### Which app?

- **`apps/api`** — every business rule and every piece of data: who can see what, what happens when something is created, payments, emails, scheduled work. A future mobile app will use the same API, so nothing that matters may live only in the web app.
- **`apps/app`** — every screen: the public site (home, guides, events, community) and the signed-in screens (logins, crew console, forms). It reads and writes data only through the API (`getApi()` in `apps/app/src/lib/api.ts`).
- When unsure, ask the user: "Should this also work in a mobile app or for another system?" Yes → the rule goes in `apps/api` and the screen in `apps/app`.

### How a feature is built (end to end)

1. **Schema:** add or change tables in `packages/db/src/schema/`, then `pnpm db:generate` (writes a SQL migration) and `pnpm db:migrate`.
2. **Contract:** add the request/response schemas to `packages/shared`.
3. **API:** add a module in `apps/api/src/<domain>/` (controller + service), copying `apps/api/src/notes/`.
4. **Client:** `pnpm build` regenerates `apps/api/openapi.json` and the typed client. Commit both with the change.
5. **Screen:** add the page in `apps/app/src/app/`, copying `apps/app/src/app/notes/`.

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
