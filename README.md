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
pnpm db:seed && pnpm census && pnpm engine
pnpm dev
```

`db:seed` loads the hand-checked events, places and sources, `census` the FAA's fields, airports and airspace for Florida, and `engine` reads every active source. Then open http://localhost:3000 and sign in with any email: locally the sign-in link is printed in the API's console instead of being emailed. Put your address in `CREW_EMAILS` (`apps/api/.env`) to open the crew console at `/crew`. API docs: http://localhost:3001/docs.

## Quick start

Requirements: Node.js 24 (`nvm use`) and pnpm (`corepack enable pnpm`, or `npm install -g pnpm`).

```bash
pnpm install
pnpm dev
```

## Working with AI agents

Open this folder in Claude Code, Cursor, GitHub Copilot or Codex — they read [`AGENTS.md`](./AGENTS.md) automatically. Describe what you need in business terms ("add a pricing page with three plans", "add a contact section with our office addresses") and let the agent follow the standard. It will suggest the right way of working for each request:

| Skill       | Use it to…                                                        |
| ----------- | ----------------------------------------------------------------- |
| `/guide`    | See what you can ask for and where to start                       |
| `/plan`     | Plan something new before building it (questions → spec → slices) |
| `/fix`      | Fix something that's broken, with proof                           |
| `/document` | Document the project or a part of it                              |
| `/ship`     | Deliver a finished change as a pull request, ready for review     |
| `/takeover` | Pick up someone else's unfinished work                            |

Before committing, run `pnpm check`.

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

- [`AGENTS.md`](./AGENTS.md) — rules and recipes for AI agents (and humans), including which skill to use for each kind of request
- [`docs/SYSTEM.md`](./docs/SYSTEM.md) — the map: what runs where and how the pieces connect
- [`docs/bits/`](./docs/bits/README.md) — the catalog of bits: each piece of behaviour, end to end
- [`docs/specs/`](./docs/specs/README.md) — specifications of features, written with `/plan`
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — running, deploying, rolling back, access and backups
- [`docs/LAUNCH.md`](./docs/LAUNCH.md) — the owner's checklist to take Servo 1.0 live
- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — how this project is deployed to AWS
- [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) — domain, DNS, TLS and security settings
- [`docs/GITHUB.md`](./docs/GITHUB.md) — repository setup and protections
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — log of decisions made during development
