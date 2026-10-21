# Servo

Built on the **Itaca Technologies standard stack** `platform`, hosted on **AWS (`sst`)** behind **Cloudflare**, with code on **GitHub**.

**Stack:** a pnpm monorepo with one Next.js app (public site and signed-in screens) and the API behind it (ready for a mobile app):

| Folder                                         | What                                      | Built on                           | Dev URL               | Production              |
| ---------------------------------------------- | ----------------------------------------- | ---------------------------------- | --------------------- | ----------------------- |
| [`apps/app`](./apps/app)                       | Public site and web application           | Next.js 16 (App Router) · React 19 | http://localhost:3000 | https://www.example.com |
| [`apps/api`](./apps/api)                       | Backend: sign-in, business rules, data    | NestJS · Better Auth · OpenAPI     | http://localhost:3001 | https://api.example.com |
| [`packages/db`](./packages/db)                 | Database schema and migrations            | PostgreSQL · Drizzle ORM           | —                     | Amazon RDS              |
| [`packages/shared`](./packages/shared)         | Validation schemas shared by API and apps | Zod                                | —                     | —                       |
| [`packages/api-client`](./packages/api-client) | Typed API client (generated from OpenAPI) | openapi-fetch                      | —                     | —                       |
| [`packages/ui`](./packages/ui)                 | Shared shadcn/ui components and theme     | Tailwind CSS 4 · shadcn/ui         | —                     | —                       |

First run (needs Docker for the local database):

```bash
pnpm install
pnpm db:up && pnpm db:migrate
cp apps/api/.env.example apps/api/.env && cp apps/app/.env.example apps/app/.env
pnpm dev
```

Then open http://localhost:3000, create an account and try the example notes page. API docs: http://localhost:3001/docs.

## Quick start

Requirements: Node.js 24 (`nvm use`) and pnpm (`corepack enable pnpm`, or `npm install -g pnpm`).

```bash
pnpm install
pnpm dev
```

## Working with AI agents

Open this folder in Claude Code, Cursor, GitHub Copilot or Codex — they read [`AGENTS.md`](./AGENTS.md) automatically. Describe what you need in business terms ("add a pricing page with three plans", "add a contact section with our office addresses") and let the agent follow the standard. Before committing, run `pnpm check`.

## Scripts

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Development server                      |
| `pnpm build`     | Production build                        |
| `pnpm check`     | Format check, lint, typecheck and build |
| `pnpm format`    | Format every file with Prettier         |
| `pnpm lint`      | ESLint                                  |
| `pnpm typecheck` | TypeScript                              |

## Documentation

- [`AGENTS.md`](./AGENTS.md) — rules and recipes for AI agents (and humans)
- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — how this project is deployed to AWS
- [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) — domain, DNS, TLS and security settings
- [`docs/GITHUB.md`](./docs/GITHUB.md) — repository setup and protections
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — log of decisions made during development
