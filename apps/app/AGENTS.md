# AGENTS.md — `apps/app`

The public site and web application of SunTzu RC (https://www.suntzurc.com). Read the root [`AGENTS.md`](../../AGENTS.md) first: its golden rules, monorepo rules and "When to stop" apply here too.

- **This app is the screens only.** Data and business rules live in `apps/api`. Read and write through `getApi()` (`src/lib/api.ts`), a typed client that forwards the signed-in user's session; never connect to the database or add server-side business logic here.
- Sign-in, sign-up and sign-out use `authClient` from `src/lib/auth-client.ts` (Better Auth, served by the API). Private pages are listed in `src/proxy.ts` `matcher`; the API still checks every request.
- Validate forms with the schemas from `@workspace/shared` (the API validates again).
- UI components come from `packages/ui`: `import { Button } from "@workspace/ui/components/button"`.
- Add dependencies to this app only: `pnpm --filter @workspace/app add <pkg>`.
- Public pages (home, guides, events, community) live here too: SunTzu RC has no separate Astro site. Keep them Server Components and indexable.
- SunTzu RC specifics (content, Anatomy figures, forms): see "SunTzu RC project notes" in the root `AGENTS.md`.
- **Errors and traces are automatic:** `src/instrumentation.ts` records every server error (page, Server Action, route handler) in the request's trace and as a JSON log line with `level: "error"`, which the error alarm counts; `src/instrumentation.node.ts` sends the traces (docs/OPERATIONS.md, "Monitoring"). Don't catch errors just to hide them, and never put personal data (emails, names, tokens) in error messages or logs.

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
  lib/site.ts          app name, description, navigation, public URL
  lib/env.ts           validated server environment variables
  lib/api.ts           typed API client for the server (forwards the user's session)
  lib/auth-client.ts   Better Auth client for the browser (sign in / sign out)
  proxy.ts             sends signed-out visitors of private pages to /sign-in
  app/globals.css      imports the shared theme from packages/ui
public/                static files served as-is
```

`src/app/notes/` is the reference example: Server Component page that reads from the API + Client Component form + Server Action that validates with `@workspace/shared` and calls the API. Copy its pattern.

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

| Need                  | Itaca standard                                                                 |
| --------------------- | ------------------------------------------------------------------------------ |
| Database              | Never from this app: add an endpoint to `apps/api` and call it with `getApi()` |
| Authentication        | Better Auth, served by `apps/api` (`src/lib/auth-client.ts`)                   |
| Forms with complex UX | shadcn/ui Field + React Hook Form + Zod                                        |
| Email                 | Amazon SES                                                                     |
| File uploads          | Amazon S3 with presigned URLs                                                  |
| Tables / charts       | shadcn/ui Data Table (TanStack Table) / shadcn/ui Charts                       |
| Dates                 | date-fns                                                                       |
| Tests                 | Vitest (unit) + Playwright (end-to-end)                                        |

## When to stop (this app)

- **Background jobs, queues, websockets or heavy processing** (reports, imports, video): they belong in `apps/api`, never in this app — ask Itaca engineering for the right AWS service.
