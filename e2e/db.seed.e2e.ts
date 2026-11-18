import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { psql, runScript } from "./jobs.ts";

// docs/bits/db.seed.md: `pnpm db:seed` loads the hand-checked events, fields, clubs, series and
// sources (apps/api/src/events/seed-data.ts), each event backed by the crew's own source. The e2e
// database is seeded at every start (database.ts), so the first test reads it through the API; the
// second loads it into a database of its own, because seeding the shared one again would undo
// what other tests change in the seeded clubs.
test.describe("db.seed", () => {
  const EVENTS = [
    ["jets-over-deland-2026", "Jets Over DeLand"],
    ["jets-over-miami-2026", "Jets Over Miami"],
    ["snowbird-nationals-2027", "Snowbird Nationals"],
    ["3d-over-the-glades-2027", "3D Over the Glades"],
    ["jacksonville-jet-madness-2027", "Jacksonville Jet Madness"],
    ["ace-of-aces-2027", "Ace of Aces"],
    ["sforcs", "South Florida Off Road Championship Series"],
  ] as const;
  const PLACES = [
    ["silver-field", "Silver Field", "amps"],
    ["markham-park", "Markham Park", "markham-park-pilots"],
    ["west-delray-flying-field", "West Delray Regional Park flying field", "palm-beach-rc"],
    ["dyer-park", "Dyer Park", "rc-bush-pilots"],
    ["coral-springs-rc-track", "Coral Springs RC Track", "coral-springs-rc-track"],
    ["west-delray-car-track", "West Delray Regional Park car track", null],
  ] as const;
  const HOSTS = [
    ["amps", "Aero Modelers of Perrine"],
    ["deland-rc", "DeLand RC"],
    ["imperial-rc-club", "Imperial R/C Club"],
    ["sarasota-silent-flyers", "Sarasota Silent Flyers"],
  ] as const;

  test("the hand-checked events, fields and clubs are there from the start", async ({
    page,
    request,
  }) => {
    for (const [slug, name] of EVENTS) {
      const response = await request.get(`${API}/events/${slug}`);
      expect(response.status(), slug).toBe(200);
      const event = (await response.json()) as {
        name: string;
        sources: { name: string; byCrew: boolean }[];
      };
      expect(event.name).toBe(name);
      // Backed by the crew's hand-checked calendar, like any other evidence.
      expect(event.sources).toContainEqual(
        expect.objectContaining({ name: "SunTzu RC crew, hand-checked calendar", byCrew: true }),
      );
    }
    for (const [slug, name, host] of PLACES) {
      const response = await request.get(`${API}/places/${slug}`);
      expect(response.status(), slug).toBe(200);
      const place = (await response.json()) as { name: string; host: { slug: string } | null };
      expect(place.name).toBe(name);
      expect(place.host?.slug ?? null).toBe(host);
    }
    for (const [slug, name] of HOSTS) {
      const response = await request.get(`${API}/hosts/${slug}`);
      expect(response.status(), slug).toBe(200);
      expect(((await response.json()) as { name: string }).name).toBe(name);
    }

    // And on the site.
    await page.goto("/events/jets-over-miami-2026");
    await expect(page.getByRole("heading", { level: 1, name: "Jets Over Miami" })).toBeVisible();
  });

  test("it needs a migrated database, and loading it again adds nothing and restores what changed", async () => {
    test.setTimeout(120_000);
    const database = `e2e_seed_${randomBytes(4).toString("hex")}`;
    psql("postgres", `CREATE DATABASE ${database}`);
    try {
      expect(() => runScript("seed", database)).toThrow(/does not exist/);
      runScript("migrate", database);
      const first = runScript("seed", database);
      const printed = first.match(
        /Seeded (\d+) hosts, (\d+) places, (\d+) series, (\d+) sources and (\d+) events/,
      );
      expect(printed, first).toBeTruthy();
      const count = (table: string) => Number(psql(database, `SELECT count(*) FROM ${table}`));
      const counts = () =>
        ["hosts", "places", "series", "sources", "events", "sightings", "event_sightings"].map(
          count,
        );
      const loaded = counts();
      expect(loaded.slice(0, 5)).toEqual(printed!.slice(1).map(Number));
      // Every event has its sighting from the crew's source (servo-crew).
      expect(
        psql(
          database,
          `SELECT count(*) FROM events e WHERE NOT EXISTS (
             SELECT 1 FROM event_sightings es JOIN sightings s ON s.id = es.sighting_id
             JOIN sources src ON src.id = s.source_id WHERE es.event_id = e.id AND src.slug = 'servo-crew')`,
        ),
      ).toBe("0");

      // Someone renames a seeded club locally; the next seed matches rows by slug and restores it.
      psql(database, "UPDATE hosts SET name = 'Renamed by hand' WHERE slug = 'amps'");
      expect(runScript("seed", database)).toContain(printed![0]);
      expect(counts()).toEqual(loaded);
      expect(psql(database, "SELECT name FROM hosts WHERE slug = 'amps'")).toBe(
        "Aero Modelers of Perrine",
      );
    } finally {
      psql("postgres", `DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    }
  });
});
