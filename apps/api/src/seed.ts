// Loads the events engine's starting data (src/events/seed-data.ts) into the database.
// Safe to run again: rows are matched by slug and updated. Local use only:
// `pnpm db:seed` from the root, after `pnpm db:migrate`.
import { createDb, getTableColumns, sql } from "@workspace/db";
import {
  eventSightings,
  events,
  hosts,
  places,
  series,
  sightings,
  sources,
} from "@workspace/db/schema";
import type { SightingFields } from "@workspace/shared";
import { env } from "./env.js";
import { fingerprint } from "./events/engine/read.js";
import { CREW_SOURCE, EVENTS, HOSTS, PLACES, SERIES, SOURCES } from "./events/seed-data.js";

/** On a slug conflict, overwrite every column the seed sets with the seeded value. */
function seededColumns(table: Parameters<typeof getTableColumns>[0], rows: object[]) {
  const columns = getTableColumns(table);
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  return Object.fromEntries(
    [...keys].map((key) => [key, sql.raw(`excluded."${columns[key]!.name}"`)]),
  );
}

function bySlug(rows: { id: string; slug: string }[]) {
  return new Map(rows.map((row) => [row.slug, row.id]));
}

function idOf(ids: Map<string, string>, slug: string | undefined, what: string) {
  if (!slug) return null;
  const id = ids.get(slug);
  if (!id) throw new Error(`Seed data links to unknown ${what} "${slug}"`);
  return id;
}

const { db, pool } = createDb(env.DATABASE_URL);

try {
  await db.transaction(async (tx) => {
    const hostIds = bySlug(
      await tx
        .insert(hosts)
        .values(HOSTS)
        .onConflictDoUpdate({ target: hosts.slug, set: seededColumns(hosts, HOSTS) })
        .returning({ id: hosts.id, slug: hosts.slug }),
    );

    const placeRows = PLACES.map(({ host, ...place }) => ({
      ...place,
      hostId: idOf(hostIds, host, "host"),
    }));
    const placeIds = bySlug(
      await tx
        .insert(places)
        .values(placeRows)
        .onConflictDoUpdate({ target: places.slug, set: seededColumns(places, placeRows) })
        .returning({ id: places.id, slug: places.slug }),
    );

    const seriesRows = SERIES.map(({ host, place, ...item }) => ({
      ...item,
      hostId: idOf(hostIds, host, "host"),
      placeId: idOf(placeIds, place, "place"),
    }));
    const seriesIds = bySlug(
      await tx
        .insert(series)
        .values(seriesRows)
        .onConflictDoUpdate({ target: series.slug, set: seededColumns(series, seriesRows) })
        .returning({ id: series.id, slug: series.slug }),
    );

    const sourceRows = SOURCES.map(({ host, ...source }) => ({
      ...source,
      hostId: idOf(hostIds, host, "host"),
    }));
    const sourceIds = bySlug(
      await tx
        .insert(sources)
        .values(sourceRows)
        .onConflictDoUpdate({ target: sources.slug, set: seededColumns(sources, sourceRows) })
        .returning({ id: sources.id, slug: sources.slug }),
    );

    const now = new Date();
    const eventRows = EVENTS.map(({ host, place, series: seriesSlug, ...event }) => ({
      ...event,
      hostId: idOf(hostIds, host, "host"),
      placeId: idOf(placeIds, place, "place"),
      seriesId: idOf(seriesIds, seriesSlug, "series"),
      publishedAt: now,
      // The day the hand-typed calendar was last checked against the organisers' pages.
      lastCheckedAt: new Date("2026-10-20T12:00:00Z"),
    }));
    const eventIds = bySlug(
      await tx
        .insert(events)
        .values(eventRows)
        .onConflictDoUpdate({ target: events.slug, set: seededColumns(events, eventRows) })
        .returning({ id: events.id, slug: events.slug }),
    );

    // Each seeded event is backed by one sighting from the crew's calendar, so the engine
    // treats it like any other evidence once real sources report the same event.
    const crewSourceId = sourceIds.get(CREW_SOURCE.slug)!;
    for (const event of EVENTS) {
      const placeText = PLACES.find((place) => place.slug === event.place)?.name ?? event.placeText;
      const fields: SightingFields = {
        name: event.name,
        kind: event.kind,
        discipline: event.discipline,
        startDate: event.startDate,
        ...(event.endDate && { endDate: event.endDate }),
        ...(placeText && { placeText }),
        ...(event.url && { url: event.url }),
        ...(event.summary && { summary: event.summary }),
        ...(event.sanctions?.length && { sanctions: event.sanctions }),
      };
      const [sighting] = await tx
        .insert(sightings)
        .values({
          sourceId: crewSourceId,
          externalId: event.slug,
          fingerprint: fingerprint(fields),
          name: fields.name,
          startDate: fields.startDate,
          endDate: fields.endDate ?? null,
          fields,
        })
        .onConflictDoUpdate({
          target: [sightings.sourceId, sightings.externalId, sightings.fingerprint],
          set: { lastSeenAt: now },
        })
        .returning({ id: sightings.id });

      await tx
        .insert(eventSightings)
        .values({ eventId: eventIds.get(event.slug)!, sightingId: sighting!.id, linkedBy: "crew" })
        .onConflictDoNothing();
    }

    console.log(
      `Seeded ${hostIds.size} hosts, ${placeIds.size} places, ${seriesIds.size} series, ` +
        `${sourceIds.size} sources and ${eventIds.size} events`,
    );
  });
} finally {
  await pool.end();
}
