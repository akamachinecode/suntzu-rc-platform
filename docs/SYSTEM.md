# System

What runs where, and how the pieces connect. Keep it current: a change to a piece, an integration or an environment updates this file in the same pull request.

## Pieces

| Piece         | What                                                                                                                           | Code                                       | URL                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------- |
| Site and app  | Next.js 16: the public pages (home, guides, events, places, community) and the signed-in screens; data only through the API    | `apps/app/`                                | https://www.example.com    |
| API           | NestJS: sign-in (Better Auth), the public events API and calendar feeds, business rules, data                                  | `apps/api/`                                | https://api.example.com    |
| Events engine | Reads sources (ICS, schema.org JSON-LD, WordPress events API, Wild Apricot RSS, schedule tables) into sightings; `pnpm engine` | `apps/api/src/events/engine/`              | runs from the command line |
| Places census | Loads the FAA registers (recognised areas, fixed sites, airports, airspace) and Census ZIP codes; `pnpm census`                | `apps/api/src/places/census/`              | runs from the command line |
| Database      | PostgreSQL (Amazon RDS): users, events, places, hosts, sources and the evidence behind them                                    | `packages/db/`                             | private network only       |
| Contracts     | Zod schemas shared by API and app; typed client generated from `openapi.json`                                                  | `packages/shared/`, `packages/api-client/` | —                          |
| Theme and UI  | shadcn/ui components and Servo's brand tokens                                                                                  | `packages/ui/`                             | —                          |

Servo has no separate Astro site (`apps/web`): its public pages are the product, so they live in `apps/app` (see `DECISIONS.md`, 2026-10-21).

```text
Visitor ──► Cloudflare ──┬─► www: AWS (Next.js, apps/app) ──┐  x-request-id
                         └─► api: AWS (NestJS on Fargate) ◄─┘──► PostgreSQL (RDS)
Calendar apps ──► www/events/calendar.ics ──► api/events/calendar.ics
Engine (command) ──► organisers' sites (robots.txt, 2 s per site) ──► PostgreSQL
Census (command) ──► FAA open data (ArcGIS) + Census Bureau Gazetteer ──► PostgreSQL
```

Every API request gets a trace ID (`x-request-id`, or Cloudflare's `cf-ray`), returned in the response and written in one JSON log line together with the bit it belongs to (`@Bit()` on the route). To follow a bit end to end, search the logs for its name or for one request's ID. Public pages read through `getPublicApi()`, which sends no trace ID so that its responses stay cacheable; the API still logs each of those requests with its own ID.

## Integrations

| Service              | What for                                                           | Where it's configured              |
| -------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Cloudflare           | DNS, TLS, WAF and DDoS protection in front of everything           | [`CLOUDFLARE.md`](./CLOUDFLARE.md) |
| AWS                  | Hosting (`sst`, region `us-east-1` until C1 is settled)            | [`DEPLOY.md`](./DEPLOY.md)         |
| GitHub               | Code, pull requests and CI                                         | [`GITHUB.md`](./GITHUB.md)         |
| OpenFreeMap          | Base map tiles for the events maps (free, no key)                  | `apps/app/src/components/events/`  |
| Organisers' websites | What the engine reads (each one is a row in `sources`)             | `pnpm db:seed`, `sources` table    |
| FAA open data        | Recognised areas, fixed sites, airports, airspace (public, no key) | `apps/api/src/places/census/`      |
| US Census Bureau     | ZIP code centres (Gazetteer ZCTA file, public, no key)             | `apps/api/src/places/census/`      |

## Environments

| Environment | URL                                           | Deployed from                          |
| ----------- | --------------------------------------------- | -------------------------------------- |
| Local       | http://localhost:3000 and :3001 (`README.md`) | `pnpm dev`                             |
| Production  | https://www.example.com (not deployed yet)    | `main`, see [`DEPLOY.md`](./DEPLOY.md) |
