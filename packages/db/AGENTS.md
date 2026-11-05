# AGENTS.md — `packages/db`

Database schema, migrations and client (PostgreSQL + Drizzle ORM). Only `apps/api` uses this package. Read the root [`AGENTS.md`](../../AGENTS.md) first.

- Tables live in `src/schema/` (one file per domain, exported from `src/schema/index.ts`). `notes.ts` is the reference: every business table has an indexed `owner_id` (or similar) that the API filters by.
- After changing the schema: `pnpm db:generate` (from the root) writes a new SQL file in `migrations/`; `pnpm db:migrate` applies it locally. Commit the SQL file with the change. In production the API applies migrations when it starts.
- Never edit or delete a migration that has been merged; write a new one. Dropping or renaming columns and tables loses data: stop and ask Itaca engineering.
- `src/schema/auth.ts` belongs to Better Auth: change it only together with `apps/api/src/auth/auth.ts`.
- Local database: `pnpm db:up` (Docker, see `compose.yaml`), browse it with `pnpm --filter @workspace/db studio`.
