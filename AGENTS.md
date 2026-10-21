# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, Codex, Gemini…) working in this repository. Humans: this is also the fastest way to understand the project.

## Project

- **Name:** Servo (working brand name)
- **Stack:** `platform` — Itaca Technologies standard stack (details below)
- **Hosting:** AWS (`sst`) with Cloudflare in front (DNS, CDN, WAF)
- **Code:** GitHub `ITACA-TECHNOLOGIES/rc-landing`
- **Created with:** `create-itaca@0.1.0` (`web-app`) on 2026-10-20, moved to the `platform` stack (create-itaca 0.2.0, unreleased branch) on 2026-10-21 (see `itaca.json` and `docs/DECISIONS.md`)

This project follows the Itaca standard so that any Itaca engineer can take it over without surprises. Staying inside the standard matters more than any single feature.

## Who you are working with

The person prompting you may not be a developer (sales, operations, a client). So:

- Use plain language and reply in the language they write in. After each change, say what changed and how to see it (`pnpm dev`, then open the local URL).
- Don't ask them to pick libraries, frameworks or architecture — this file already decides. Ask about the business need instead (who uses it, what data, what should happen).
- If something can't be done well inside this stack (see "When to stop"), say so plainly and suggest involving Itaca engineering.

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

## Servo project notes

- **Read `docs/EVENTS-ENGINE.md`** before working on events, sources or ingestion. The plan: an engine that monitors the web for RC events (Florida first), merges duplicates, verifies them and publishes them; the worker that runs it will live in `apps/api`.
- **Content** is typed data in `apps/app/src/content/` (services, events, places, rules, history, guides) until the events engine moves events and places into the database. Every factual item carries a source link; keep it that way and re-check dates before editing.
- **Anatomy figures**: use the project skill in `.claude/skills/anatomy` (read its `SKILL.md`). The kit is vendored in `apps/app/src/components/iso/`; figures live in `apps/app/src/components/figures/<name>/` following `references/react.md`. Light theme only, XT60 yellow is the single lit accent (see `.servo-figure` in `apps/app/src/app/globals.css`). Run the line check before shipping a figure.
- **Forms** (`/contact`, `/community`) validate with Zod but don't deliver messages yet (see `docs/DECISIONS.md`).

## Commands

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Local development server                                         |
| `pnpm build`     | Production build                                                 |
| `pnpm check`     | Format check + lint + typecheck + build. Must pass before commit |
| `pnpm format`    | Auto-format every file (Prettier)                                |
| `pnpm lint`      | ESLint                                                           |
| `pnpm typecheck` | TypeScript type checking                                         |

## Stack: product platform (`platform`)

A pnpm monorepo: one Next.js app (the public site and the signed-in screens) on top of one API, ready for a mobile app. Unlike the standard `platform` stack there is no Astro site (`apps/web`): Servo's public pages are the product (dynamic events, SEO per event, interactive figures), so they live in `apps/app`. Each app and package has its own `AGENTS.md` with its stack, structure and recipes — **read it before changing files there.**

```text
apps/app/             public site + web app: Next.js 16 (App Router), UI only    → https://www.example.com
apps/api/             backend: NestJS — auth, business rules, data            → https://api.example.com
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

## Deployment (AWS via SST)

- Infrastructure lives in `sst.config.ts`; deploys run from `.github/workflows/deploy.yml` when `main` changes. See `docs/DEPLOY.md`.
- Don't edit `sst.config.ts` or the workflows, and don't run `sst deploy` / `sst remove`, unless the user explicitly asks — they change real AWS resources and cost money.
- New environment variables: add them to `.env.example`, and tell the user they must also be configured for production (see `docs/DEPLOY.md`).

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
- **Background jobs, queues, scheduled tasks, websockets or file uploads:** they need new AWS pieces in `sst.config.ts` — ask Itaca engineering.

Explain to the user why the request needs an engineer, write down what you found in `docs/DECISIONS.md`, and don't improvise a workaround.
