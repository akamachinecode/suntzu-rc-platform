# db.seed — The starting data is loaded

- **Trigger:** `pnpm db:seed`.
- **Who:** developers, locally.
- **Path:** `apps/api/src/seed.ts` → `events/seed-data.ts` → PostgreSQL.
- **Data:** writes the hand-checked events, places, hosts, series and sources (idempotent).
- **Rules:** each seeded event is published and backed by a sighting from the `servo-crew` source. Safe to run again: rows are matched by slug and get the seeded values back (a local change to a seeded column is undone), and nothing is added twice.
- **Errors:** fails, writing nothing (one transaction), if the database isn't migrated.
- **Test:** `e2e/db.seed.e2e.ts` (the seeded events, with the crew's calendar as their source, fields and clubs are served by the API and the site; in a database of its own: refused before migrating, the same rows after a second run, and a renamed club restored)
- **Observe:** command output.
- **Status:** verified — 2026-11-18 (end-to-end test)
