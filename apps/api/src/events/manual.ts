import { and, eq, schema } from "@workspace/db";
import type { Event, Source } from "@workspace/db/schema";
import type { ManualEvent } from "@workspace/shared";
import { fingerprint } from "./engine/read.js";
import { confidenceOf, nameTokens, regionOf, slugify } from "./engine/match.js";
import type { Tx } from "./engine/resolve.js";

const { events, sightings, eventSightings, changes, places, hosts, series, sources } = schema;

const YEARLY = new Set(["fly-in", "competition", "show", "swap-meet"]);

/**
 * An event typed by a person who speaks for it: the crew, or a verified organiser. It's published
 * at once and backed by a sighting from that person's source, like everything else, so later
 * sightings from the web link to it and its page lists where it came from.
 */
export async function publishManual(
  tx: Tx,
  input: ManualEvent,
  options: { source: Source; hostId: string | null; by: "crew" | "organiser" },
): Promise<Event> {
  const place = input.place
    ? (await tx.select().from(places).where(eq(places.slug, input.place)))[0]
    : undefined;
  const hostId =
    options.hostId ??
    (input.host
      ? ((await tx.select().from(hosts).where(eq(hosts.slug, input.host)))[0]?.id ?? null)
      : null) ??
    place?.hostId ??
    null;
  const endDate = input.endDate || undefined;
  const fields = {
    name: input.name,
    kind: input.kind,
    discipline: input.discipline,
    startDate: input.startDate,
    ...(endDate && { endDate }),
    ...(input.placeText && { placeText: input.placeText }),
    ...(input.url && { url: input.url }),
    ...(input.entryFee && { entryFee: input.entryFee }),
    ...(input.summary && { summary: input.summary }),
  };
  const now = new Date();
  const slug = await freeSlug(tx, slugify(`${input.name}-${input.startDate.slice(0, 4)}`));
  const [event] = await tx
    .insert(events)
    .values({
      slug,
      name: input.name,
      kind: input.kind,
      discipline: input.discipline,
      status: options.by === "organiser" ? "confirmed" : "announced",
      startDate: input.startDate,
      endDate: endDate ?? null,
      region: regionOf(place?.county ?? null, input.placeText),
      placeId: place?.id ?? null,
      placeText: place ? null : (input.placeText ?? null),
      hostId,
      summary: input.summary ?? "",
      url: input.url || null,
      entryFee: input.entryFee || null,
      beginnerFriendly: input.beginnerFriendly ?? false,
      confidence: confidenceOf([options.source.trust]),
      publishedAt: now,
      lastCheckedAt: now,
    })
    .returning();
  const [sighting] = await tx
    .insert(sightings)
    .values({
      sourceId: options.source.id,
      externalId: `${options.by}:${slug}`,
      fingerprint: fingerprint(fields),
      name: input.name,
      startDate: input.startDate,
      endDate: endDate ?? null,
      fields,
      evidence: {},
    })
    .returning();
  await tx.insert(eventSightings).values({
    eventId: event!.id,
    sightingId: sighting!.id,
    linkedBy: options.by === "crew" ? "crew" : "engine",
  });
  await tx.insert(changes).values({
    eventId: event!.id,
    field: "created",
    newValue: { name: input.name, startDate: input.startDate, by: options.by },
    sightingId: sighting!.id,
    changedBy: options.by,
  });

  // Join its series, or start one for the kinds that come back every year.
  const tokens = nameTokens(input.name).join(" ");
  const known = (await tx.select().from(series)).find(
    (row) => nameTokens(row.name).join(" ") === tokens && (!row.hostId || row.hostId === hostId),
  );
  let seriesId = known?.id;
  if (!seriesId && YEARLY.has(input.kind)) {
    const [created] = await tx
      .insert(series)
      .values({
        slug: await freeSeriesSlug(tx, slugify(input.name)),
        name: input.name,
        kind: input.kind,
        discipline: input.discipline,
        hostId,
        placeId: place?.id ?? null,
        usualMonth: Number(input.startDate.slice(5, 7)),
      })
      .returning();
    seriesId = created!.id;
  }
  if (!seriesId) return event!;
  const [linked] = await tx
    .update(events)
    .set({ seriesId })
    .where(eq(events.id, event!.id))
    .returning();
  return linked!;
}

/** Each organiser speaks through their own source, so their events carry the organiser's trust. */
export async function organiserSource(
  tx: Tx,
  host: { id: string; slug: string; name: string; url: string | null },
) {
  const slug = `organiser-${host.slug}`;
  const [existing] = await tx.select().from(sources).where(eq(sources.slug, slug));
  if (existing) return existing;
  const [created] = await tx
    .insert(sources)
    .values({
      slug,
      name: `${host.name} (on Servo)`,
      url: host.url ?? `https://servo.invalid/clubs/${host.slug}`,
      adapter: "manual",
      trust: "organiser",
      status: "active",
      hostId: host.id,
      permission: "Published on Servo by a verified organiser.",
    })
    .returning();
  return created!;
}

export async function crewSource(tx: Tx): Promise<Source> {
  const [source] = await tx
    .select()
    .from(sources)
    .where(and(eq(sources.slug, "servo-crew")));
  if (!source) throw new Error('The "servo-crew" source is missing: run pnpm db:seed');
  return source;
}

async function freeSlug(tx: Tx, base: string): Promise<string> {
  let slug = base;
  for (
    let n = 2;
    (await tx.select({ id: events.id }).from(events).where(eq(events.slug, slug))).length;
    n++
  ) {
    slug = `${base}-${n}`;
  }
  return slug;
}

async function freeSeriesSlug(tx: Tx, base: string): Promise<string> {
  let slug = base;
  for (
    let n = 2;
    (await tx.select({ id: series.id }).from(series).where(eq(series.slug, slug))).length;
    n++
  ) {
    slug = `${base}-${n}`;
  }
  return slug;
}
