# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, GitHub Copilot, Codex, Gemini…) working in this repository. Humans: this is also the fastest way to understand the project.

## Project

- **Name:** Rc Landing
- **Stack:** `web-app` — Itaca Technologies standard stack (details below)
- **Hosting:** AWS (`sst`) with Cloudflare in front (DNS, CDN, WAF)
- **Code:** GitHub `ITACA-TECHNOLOGIES/rc-landing`
- **Created with:** `create-itaca@0.1.0` on 2026-10-20 (see `itaca.json`)

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
10. **Record decisions.** New dependency, environment variable, external service, data model or route structure change → add a dated entry to `docs/DECISIONS.md`. Itaca engineers read it when they take over.

## Commands

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Local development server                                         |
| `pnpm build`     | Production build                                                 |
| `pnpm check`     | Format check + lint + typecheck + build. Must pass before commit |
| `pnpm format`    | Auto-format every file (Prettier)                                |
| `pnpm lint`      | ESLint                                                           |
| `pnpm typecheck` | TypeScript type checking                                         |

## Stack: web application (`web-app`)

Next.js 16 (App Router, React Server Components, Turbopack, React Compiler), React 19, Tailwind CSS 4, shadcn/ui (Radix), Zod, TypeScript strict.

Local dev server: `pnpm dev` → http://localhost:3000

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Useful guides in `node_modules/next/dist/docs/01-app/02-guides/`: `forms.md`, `server-actions.md`, `data-security.md`, `authentication.md`, `caching-without-cache-components.md`, `environment-variables.md`. The `next-devtools` MCP server in `.mcp.json` can also search the docs and inspect the running dev server.

### Structure

```text
src/
  app/                 routes (App Router): app/about/page.tsx → /about
  app/layout.tsx       root layout: <html>, header, footer, fonts, metadata
  app/<route>/actions.ts  Server Actions for that route ("use server")
  app/api/             Route Handlers — only for webhooks and external callers
  components/          app components
  components/ui/       shadcn/ui components (generated — avoid editing)
  lib/site.ts          app name, description, navigation, public URL
  lib/env.ts           validated server environment variables
  app/globals.css      Tailwind + theme tokens (brand colors)
public/                static files served as-is
```

`src/app/contact/` is the reference example: Server Component page + Client Component form + Server Action with Zod validation. Copy its pattern.

### Rules

- **Server Components by default.** Add `"use client"` only to the smallest component that needs state, effects, event handlers or browser APIs.
- **Mutations go through Server Actions** with Zod validation of every input, returning a serializable state (`useActionState` on the client). Check authentication and authorization inside every action — never trust the browser.
- **Fetch data in Server Components** (async components), not with `useEffect`.
- **Secrets stay on the server.** Read them through `src/lib/env.ts` (validated, `server-only`). Only `NEXT_PUBLIC_*` variables reach the browser, so never put secrets in them.
- **Cache Components are disabled** (`cacheComponents: false`) because the AWS hosting targets don't support them yet. Don't use `"use cache"`, `cacheLife` or `cacheTag`; follow `caching-without-cache-components.md`.
- **Request interception** (redirects by auth, headers) goes in `src/proxy.ts` — `middleware.ts` is deprecated in Next.js 16.
- **Metadata:** export `metadata` (or `generateMetadata`) from every `page.tsx` with `title` and `description`. Add public routes to `src/app/sitemap.ts`.

### Standard choices

When a feature needs one of these, use the Itaca standard instead of alternatives, record it in `docs/DECISIONS.md`, and tell the user that Itaca engineering should review it before production.

| Need                  | Itaca standard                                               |
| --------------------- | ------------------------------------------------------------ |
| Database              | PostgreSQL (Amazon RDS / Aurora) + Drizzle ORM, in `src/db/` |
| Authentication        | Better Auth                                                  |
| Forms with complex UX | shadcn/ui Field + React Hook Form + Zod                      |
| Email                 | Amazon SES                                                   |
| File uploads          | Amazon S3 with presigned URLs                                |
| Tables / charts       | shadcn/ui Data Table (TanStack Table) / shadcn/ui Charts     |
| Dates                 | date-fns                                                     |
| Tests                 | Vitest (unit) + Playwright (end-to-end)                      |

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

- **Background jobs, queues, websockets or heavy processing** (reports, imports, video): the hosting target may not support them — ask Itaca engineering for the right AWS service.

Explain to the user why the request needs an engineer, write down what you found in `docs/DECISIONS.md`, and don't improvise a workaround.
