# AGENTS.md — `apps/api`

The backend of Servo (https://api.example.com): sign-in, business rules and data for the web app and, later, the mobile app. Read the root [`AGENTS.md`](../../AGENTS.md) first.

NestJS 12 (Express), Better Auth, Drizzle ORM (`@workspace/db`), Zod (`@workspace/shared`), TypeScript strict, ES modules. Local: `pnpm dev:api` from the root → http://localhost:3001, interactive docs at http://localhost:3001/docs.

### Structure

```text
src/
  main.ts            starts the server (port $PORT, default 3001)
  app.ts             app setup: CORS, Better Auth routes (/auth/*), body parser, OpenAPI document
  app.module.ts      registers every module
  env.ts             validated environment variables — add new ones here AND in .env.example
  auth/              Better Auth setup and the global guard (deny by default, @Public(), @CurrentUser())
  db/db.module.ts    the Drizzle client (@InjectDb())
  common/zod.ts      ZodPipe (validate input) and openApi() (document it)
  common/trace.ts    trace ID per request (x-request-id), one log line per request, @Bit()
  health/            GET /health for the load balancer
  notes/             reference business module: copy it for each domain
  migrate.ts         applies database migrations (runs before every start in production)
  seed.ts            loads the events engine's starting data (`pnpm db:seed`, local only)
  engine.ts          runs the events engine once (`pnpm engine [source…]`)
  events/engine/     the engine: polite fetcher, readers (ICS, JSON-LD, The Events Calendar, Wild Apricot, schedule tables), run; tests and fixtures next to the code
  openapi.ts         writes openapi.json during `pnpm build`
openapi.json         the API contract (generated, committed)
```

### Rules

- **One module per business domain** (`properties/`, `payments/`…): a controller (HTTP only: routes, input, user), a service (the rules and the queries), a module. Register it in `app.module.ts`.
- **Deny by default.** Every route requires a signed-in user unless it has `@Public()`. Get the user with `@CurrentUser()`. Never accept a user or owner ID from the request body as proof of who is calling.
- **Scope every query to the caller** (e.g. `where owner_id = user.id`), and answer 404 — not 403 — for records that belong to someone else, as `notes.service.ts` does.
- **Validate every input** with a schema from `@workspace/shared` and `new ZodPipe(schema)`; document bodies and responses with `@ApiBody` / `@ApiOkResponse` and `openApi(schema)`, so the generated client stays exact.
- **Every route names its bit** with `@Bit("area.action")`, matching `docs/bits/<area>.<action>.md`. Logs carry the bit and the request's trace ID (`x-request-id`), so a bit can be followed end to end.
- **Database changes** only through `packages/db`: edit `src/schema/`, run `pnpm db:generate`, commit the new SQL migration. Never edit a migration that has been merged.
- Imports between files use the `.js` extension (`import { x } from "./x.js"`): this is an ES module project compiled by `tsc`.
- Don't log personal data (emails, names, tokens). Errors go to stdout; CloudWatch collects them in production.
- **Better Auth:** configuration in `src/auth/auth.ts`, endpoints under `/auth/*` (https://www.better-auth.com/docs). Plugins such as email OTP, two-factor, admin or organizations are added there — changes to auth are on the "stop and ask" list.

### Standard choices

| Need                        | Itaca standard                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| Database                    | PostgreSQL (Amazon RDS) + Drizzle ORM, in `packages/db`          |
| Authentication              | Better Auth (`src/auth`)                                         |
| Validation and API contract | Zod schemas in `packages/shared` + OpenAPI (`openapi.json`)      |
| Email                       | Amazon SES                                                       |
| File uploads                | Amazon S3 with presigned URLs                                    |
| Background jobs, schedules  | Amazon SQS + SST Cron (ask Itaca engineering before adding them) |
| Tests                       | Vitest (unit) + Playwright (end-to-end)                          |
