# Rc Landing

Built on the **Itaca Technologies standard stack** `web-app`, hosted on **AWS (`sst`)** behind **Cloudflare**, with code on **GitHub**.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui · Zod · TypeScript.

Dev server: http://localhost:3000 · Health check: `/api/health` · Example form with Server Action: `/contact`

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
