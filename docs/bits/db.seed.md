# db.seed — The starting data is loaded

- **Trigger:** `pnpm db:seed`.
- **Who:** developers, locally.
- **Path:** `apps/api/src/seed.ts` → `events/seed-data.ts` → PostgreSQL.
- **Data:** writes the hand-checked events, places, hosts, series and sources (idempotent).
- **Rules:** each seeded event is backed by a sighting from the `servo-crew` source.
- **Errors:** fails if the database isn't migrated.
- **Test:** none yet.
- **Observe:** command output.
- **Status:** read in code — 2026-10-27
