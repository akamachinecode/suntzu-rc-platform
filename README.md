# SunTzu RC

The free calendar, map and community of RC in Florida: events read from organisers' own pages, every field and track from the FAA registers, clubs that publish for free, and guides that take planes, helicopters and cars apart. https://www.suntzurc.com

Built on the **Itaca Technologies standard stack** `platform`, hosted on **AWS (Terraform)** behind **Cloudflare**, with code on **GitHub**.

**Stack:** a pnpm monorepo with one Next.js app (public site and signed-in screens) and the API behind it (ready for a mobile app):

| Folder                                         | What                                      | Built on                           | Dev URL               | Production                                                           |
| ---------------------------------------------- | ----------------------------------------- | ---------------------------------- | --------------------- | -------------------------------------------------------------------- |
| [`apps/app`](./apps/app)                       | Public site and web application           | Next.js 16 (App Router) · React 19 | http://localhost:3000 | https://www.suntzurc.com                                             |
| [`apps/api`](./apps/api)                       | Backend: sign-in, business rules, data    | NestJS · Better Auth · OpenAPI     | http://localhost:3001 | https://api.suntzurc.com                                             |
| [`apps/docs`](./apps/docs)                     | Docs portal, built from `docs/`           | Fumadocs · Next.js (static)        | http://localhost:3002 | [GitHub Pages](https://akamachinecode.github.io/suntzu-rc-platform/) |
| [`packages/db`](./packages/db)                 | Database schema and migrations            | PostgreSQL · Drizzle ORM           | —                     | Amazon RDS                                                           |
| [`packages/shared`](./packages/shared)         | Validation schemas shared by API and apps | Zod                                | —                     | —                                                                    |
| [`packages/api-client`](./packages/api-client) | Typed API client (generated from OpenAPI) | openapi-fetch                      | —                     | —                                                                    |
| [`packages/ui`](./packages/ui)                 | Shared shadcn/ui components and theme     | Tailwind CSS 4 · shadcn/ui         | —                     | —                                                                    |

First run (needs Docker for the local database):

```bash
pnpm install
pnpm db:up && pnpm db:migrate
cp apps/api/.env.example apps/api/.env && cp apps/app/.env.example apps/app/.env
pnpm db:seed && pnpm census && pnpm engine
pnpm dev
```

`db:seed` loads the hand-checked events, places and sources, `census` the FAA's fields, airports and airspace for Florida, and `engine` reads every active source. Then open http://localhost:3000 and sign in with any email: locally the sign-in link is printed in the API's console instead of being emailed. Put your address in `CREW_EMAILS` (`apps/api/.env`) to open the crew console at `/crew`. API docs: http://localhost:3001/docs.

## Example project for `create-itaca@0.3.1`

SunTzu RC is the reference project for the `platform` stack with the `terraform` deploy target of `create-itaca@0.3.1`: a real product built entirely inside the Itaca standard. Use it to see how the template grows:

| To see…                                                                    | Look at                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A feature end to end (schema → contract → API → screen)                    | `packages/db/src/schema/`, `packages/shared/`, `apps/api/src/search/`, `apps/app/src/app/search/`             |
| Specs written with `/plan` and built slice by slice                        | [`docs/specs/`](./docs/specs)                                                                                 |
| The catalog of bits, one per piece of behaviour                            | [`docs/bits/`](./docs/bits/README.md)                                                                         |
| Terraform beyond the template: email, S3, scheduled jobs, optional secrets | [`infra/`](./infra) (`email.tf`, `storage.tf`, `jobs.tf`, `secrets.tf`), [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Running a job by hand from GitHub Actions                                  | [`.github/workflows/task.yml`](./.github/workflows/task.yml)                                                  |
| Every deviation from the template, and why                                 | [`docs/DECISIONS.md`](./docs/DECISIONS.md) (search for "on purpose")                                          |
| Going live, step by step                                                   | [`docs/LAUNCH.md`](./docs/LAUNCH.md)                                                                          |

Deviations on purpose: no `apps/web` (the public pages are the product, so they live in `apps/app` on `www`), PostgreSQL 18, Vitest, and AWS resources prefixed with the repository's name (`rc-landing`). `itaca.json` records the version.

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

## Contributing

SunTzu RC is open: anyone can run it, improve it and send a pull request. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) (running it locally, the rules, how review works), ask questions in [Discussions](https://github.com/akamachinecode/suntzu-rc-platform/discussions), and report security problems privately as [`SECURITY.md`](./SECURITY.md) explains. Everyone follows the [code of conduct](./CODE_OF_CONDUCT.md).

## Licence

- **Code:** [MIT](./LICENSE). Use it, change it and share it, keeping the copyright notice.
- **Guides and figures:** the text of the guides and other site content in `apps/app/src/content/`, and the drawings in `apps/app/src/components/figures/`, are licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Reuse them with credit to SunTzu RC and a link to https://www.suntzurc.com.
- **Name and logo:** the SunTzu RC name, the wordmark (`apps/app/src/components/wordmark.tsx`) and the icons aren't licensed. A copy of the project that runs as its own service needs its own name and logo.
- **Third-party material** keeps its own licence: the Anatomy figure kit in `apps/app/src/components/iso/` (MIT, see its `LICENSE`), and the facts, quotes and data credited to their sources where they appear (FAA and US Census data are public).

## Documentation

Everything below is also one website with search: the **[SunTzu RC docs portal](https://akamachinecode.github.io/suntzu-rc-platform/)**, published from these files whenever they change on `main`.

- [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), [`SECURITY.md`](./SECURITY.md) — taking part: running it locally, pull requests, behaviour and reporting vulnerabilities
- [`AGENTS.md`](./AGENTS.md) — rules and recipes for AI agents (and humans), including which skill to use for each kind of request
- [`docs/guides/`](./docs/guides) — [run it locally](./docs/guides/RUN-LOCALLY.md) and [your first contribution](./docs/guides/FIRST-CONTRIBUTION.md), step by step
- [`docs/SYSTEM.md`](./docs/SYSTEM.md) — the map: what runs where and how the pieces connect
- [`docs/DELIVERY.md`](./docs/DELIVERY.md) — from code to production: CI, deploys, Docker images, OIDC and the scheduled jobs
- [`docs/bits/`](./docs/bits/README.md) — the catalog of bits: each piece of behaviour, end to end
- [`docs/specs/`](./docs/specs/README.md) — specifications of features, written with `/plan`
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — running, deploying, rolling back, access and backups
- [`docs/LAUNCH.md`](./docs/LAUNCH.md) — the owner's checklist to take SunTzu RC 1.0 live
- [`docs/DEPLOY.md`](./docs/DEPLOY.md) — how this project is deployed to AWS
- [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) — domain, DNS, TLS and security settings
- [`docs/GITHUB.md`](./docs/GITHUB.md) — repository setup and protections
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — log of decisions made during development
