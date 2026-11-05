import { and, eq, isNotNull, type Database } from "@workspace/db";
import {
  changes,
  eventSightings,
  events,
  hosts,
  places,
  reviews,
  series,
  sightings,
  sources,
  type Event,
  type Host,
  type Place,
  type Series,
  type Sighting,
  type Source,
} from "@workspace/db/schema";
import type { EventKind, EventStatus, SightingFields } from "@workspace/shared";
import {
  confidenceOf,
  judge,
  MONTHS,
  nameTokens,
  regionOf,
  slugify,
  tidyName,
  type DateRange,
  type MatchCandidate,
  type MatchInput,
} from "./match.js";
import { addDays, localDate } from "./read.js";

// Resolve: the second half of the engine (docs/EVENTS-ENGINE.md). Readers store what each source
// said (sightings); resolve decides what we believe (events). For each source's latest version of
// each entry it links the sighting to the event it describes, creates the event when there is none,
// applies changes from sources that speak for the organiser and queues the rest for the crew.
// Then it moves past events to "held" and predicts each series' next edition.

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The event fields resolve and the crew may change; each change is kept in `changes`. */
export interface EventPatch {
  name?: string;
  startDate?: string;
  endDate?: string | null;
  datePrecision?: "day" | "month";
  dateText?: string | null;
  status?: EventStatus;
  placeId?: string | null;
  url?: string | null;
  entryFee?: string | null;
  entryUrl?: string | null;
  summary?: string;
  sanctions?: string[];
  classes?: string[];
  resultsUrl?: string | null;
  beginnerFriendly?: boolean;
}

export interface ResolveReport {
  linked: number;
  created: { name: string; startDate: string; published: boolean }[];
  changed: { name: string; fields: string[] }[];
  queued: number;
  held: number;
  predicted: string[];
  errors: string[];
}

// Kinds that usually come back every year, so their series predicts the next edition. Races are
// left out: they are mostly rounds of a season, not one-off yearly events.
const YEARLY_KINDS = new Set<EventKind>(["fly-in", "competition", "show", "swap-meet"]);

export async function resolve(db: Database, options: { now?: Date } = {}): Promise<ResolveReport> {
  const now = options.now ?? new Date();
  const today = localDate(now, "America/New_York");
  const report: ResolveReport = {
    linked: 0,
    created: [],
    changed: [],
    queued: 0,
    held: 0,
    predicted: [],
    errors: [],
  };

  const [allSources, allHosts, allPlaces, allSeries, allEvents, allSightings, links] =
    await Promise.all([
      db.select().from(sources),
      db.select().from(hosts),
      db.select().from(places),
      db.select().from(series),
      db.select().from(events),
      db.select().from(sightings),
      db.select().from(eventSightings),
    ]);
  const sourceById = new Map(allSources.map((source) => [source.id, source]));
  const seriesById = new Map(allSeries.map((row) => [row.id, row]));
  const eventById = new Map(allEvents.map((event) => [event.id, event]));
  const slugs = new Set(allEvents.map((event) => event.slug));
  const eventOfSighting = new Map(links.map((link) => [link.sightingId, link.eventId]));
  const sightingById = new Map(allSightings.map((row) => [row.id, row]));
  const linkedNames = new Map<string, Set<string>>();
  const linkedSources = new Map<string, Set<string>>();
  for (const link of links) {
    const row = sightingById.get(link.sightingId);
    if (!row) continue;
    addTo(linkedNames, link.eventId, row.name);
    addTo(linkedSources, link.eventId, row.sourceId);
  }

  // The latest version of every entry in every source.
  const latest = new Map<string, Sighting>();
  const versions = new Map<string, Sighting[]>();
  for (const row of allSightings) {
    const key = `${row.sourceId} ${row.externalId}`;
    const list = versions.get(key) ?? [];
    list.push(row);
    versions.set(key, list);
    const current = latest.get(key);
    if (
      !current ||
      row.lastSeenAt > current.lastSeenAt ||
      (row.lastSeenAt.getTime() === current.lastSeenAt.getTime() &&
        row.firstSeenAt > current.firstSeenAt)
    ) {
      latest.set(key, row);
    }
  }

  const pending = [...latest.entries()]
    .filter(([, row]) => !eventOfSighting.has(row.id))
    .map(([key, row]) => ({ row, source: sourceById.get(row.sourceId)!, key }))
    .filter(({ source }) => source && source.adapter !== "manual")
    .sort(
      (a, b) =>
        trustRank(a.source) - trustRank(b.source) ||
        a.row.firstSeenAt.getTime() - b.row.firstSeenAt.getTime(),
    );

  const reviewRows = await db
    .select({
      sightingId: reviews.sightingId,
      eventId: reviews.eventId,
      kind: reviews.kind,
      status: reviews.status,
    })
    .from(reviews)
    .where(isNotNull(reviews.sightingId));
  const openReviewSightings = new Set(
    reviewRows.filter((row) => row.status === "open").map((row) => row.sightingId),
  );
  // "Not the same event", said by the crew: that pair is never matched again.
  const notSame = new Map<string, Set<string>>();
  for (const row of reviewRows) {
    if (row.kind === "merge" && row.status === "rejected" && row.sightingId && row.eventId) {
      addTo(notSame, row.sightingId, row.eventId);
    }
  }

  for (const { row, source, key } of pending) {
    try {
      await db.transaction(async (tx) => {
        const fields = row.fields;
        const hostId = source.hostId ?? hostFromText(fields.hostText, allHosts);
        const placeId = placeFor(fields.placeText, hostId, allPlaces);

        // An earlier version of this entry is already linked: this is an update to that event.
        const earlier = versions
          .get(key)!
          .map((version) => eventOfSighting.get(version.id))
          .find((id): id is string => Boolean(id));
        let target = earlier ? eventById.get(earlier) : undefined;
        let score = 1;

        if (!target) {
          const input: MatchInput = { name: row.name, dates: rangeOf(fields), hostId, placeId };
          let best: { event: Event; score: number; kind: "same" | "maybe" } | undefined;
          for (const event of eventById.values()) {
            if (notSame.get(row.id)?.has(event.id)) continue;
            const verdict = judge(input, candidateOf(event, seriesById, linkedNames));
            if (verdict && (!best || rank(verdict) > rank(best))) best = { event, ...verdict };
          }
          if (best?.kind === "same") {
            target = best.event;
            score = best.score;
          } else if (best?.kind === "maybe") {
            if (!openReviewSightings.has(row.id)) {
              await tx.insert(reviews).values({
                kind: "merge",
                eventId: best.event.id,
                sightingId: row.id,
                sourceId: source.id,
                proposal: { event: best.event.slug, score: round(best.score) },
                note: `"${row.name}" might be "${best.event.name}"`,
              });
              openReviewSightings.add(row.id);
              report.queued++;
            }
            return;
          }
        }

        if (target) {
          await absorb(tx, target, row, source, score);
          return;
        }

        // Nothing matches: a new event, unless it's already over.
        if (lastDayOf(fields) < today) return;
        const created = await createEvent(tx, row, source, hostId, placeId);
        report.created.push({
          name: created.name,
          startDate: created.startDate,
          published: Boolean(created.publishedAt),
        });
      });
    } catch (error) {
      report.errors.push(`${row.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await markHeld();
  await predictNextEditions();
  return report;

  /** Links a sighting to its event and takes what it says into account. */
  async function absorb(tx: Tx, event: Event, row: Sighting, source: Source, score: number) {
    await tx
      .insert(eventSightings)
      .values({ eventId: event.id, sightingId: row.id, matchScore: round(score) })
      .onConflictDoNothing();
    eventOfSighting.set(row.id, event.id);
    addTo(linkedNames, event.id, row.name);
    addTo(linkedSources, event.id, source.id);
    report.linked++;

    const otherSources = [...(linkedSources.get(event.id) ?? [])].filter((id) => id !== source.id);
    // Members (community trust) never change an event on their own: the crew checks first.
    const speaksForOrganiser =
      source.trust !== "community" &&
      (source.trust === "sanctioning-body" ||
        (source.trust === "organiser" &&
          source.hostId !== null &&
          source.hostId === event.hostId) ||
        otherSources.length === 0 ||
        !event.publishedAt);
    const patch = proposePatch(event, row.fields, source.trust === "organiser");
    let current = event;
    if (Object.keys(patch).length) {
      if (speaksForOrganiser) {
        current = await applyPatch(tx, event, patch, { sightingId: row.id, by: "engine" });
        report.changed.push({ name: event.name, fields: Object.keys(patch) });
      } else if (!openReviewSightings.has(row.id)) {
        await tx.insert(reviews).values({
          kind: "change",
          eventId: event.id,
          sightingId: row.id,
          sourceId: source.id,
          proposal: { ...patch },
          note: `${source.name} says something different about "${event.name}"`,
        });
        openReviewSightings.add(row.id);
        report.queued++;
      }
    }

    const trusts = [...(linkedSources.get(event.id) ?? [])]
      .map((id) => sourceById.get(id)?.trust)
      .filter((trust) => trust !== undefined);
    // Two independent sources agree, unless the crew already said it isn't an RC event. A member's
    // link (community trust) doesn't count as one of the two: the crew checks those first.
    const independent = [...(linkedSources.get(event.id) ?? [])].filter(
      (id) => sourceById.get(id)?.trust !== "community",
    );
    const agreed = independent.length >= 2 && !current.rejectedAt;
    const [updated] = await tx
      .update(events)
      .set({
        confidence: confidenceOf(trusts),
        lastCheckedAt:
          !current.lastCheckedAt || row.lastSeenAt > current.lastCheckedAt
            ? row.lastSeenAt
            : current.lastCheckedAt,
        ...(!current.publishedAt && agreed && { publishedAt: now }),
      })
      .where(eq(events.id, event.id))
      .returning();
    eventById.set(event.id, updated!);
    if (!current.publishedAt && agreed) {
      await tx
        .update(reviews)
        .set({ status: "approved", decidedAt: now, note: "Published: two sources agree" })
        .where(
          and(
            eq(reviews.eventId, event.id),
            eq(reviews.kind, "new-event"),
            eq(reviews.status, "open"),
          ),
        );
    }
  }

  async function createEvent(
    tx: Tx,
    row: Sighting,
    source: Source,
    hostId: string | null,
    placeId: string | null,
  ): Promise<Event> {
    const fields = row.fields;
    const place = allPlaces.find((candidate) => candidate.id === placeId);
    const name = tidyName(fields.name);
    const ownSite = source.trust === "organiser" && source.hostId !== null;
    const [created] = await tx
      .insert(events)
      .values({
        slug: uniqueSlug(`${name}-${fields.startDate.slice(0, 4)}`),
        name,
        kind: fields.kind ?? "other",
        discipline: fields.discipline ?? "air",
        status: fields.cancelled ? "cancelled" : ownSite ? "confirmed" : "announced",
        startDate: fields.startDate,
        endDate: fields.endDate ?? null,
        timezone: fields.timezone ?? "America/New_York",
        region: regionOf(place?.county ?? null, fields.placeText),
        placeId,
        placeText: place ? null : (fields.placeText ?? null),
        hostId,
        summary: fields.summary ?? "",
        url: fields.url ?? null,
        sanctions: fields.sanctions ?? [],
        classes: fields.classes ?? [],
        entryFee: fields.entryFee ?? null,
        entryUrl: fields.entryUrl ?? null,
        confidence: confidenceOf([source.trust]),
        // The organiser's own site speaks for the event; anything else waits for the crew.
        publishedAt: ownSite ? now : null,
        lastCheckedAt: row.lastSeenAt,
      })
      .returning();
    const event = created!;
    await tx
      .insert(eventSightings)
      .values({ eventId: event.id, sightingId: row.id, matchScore: 1 });
    await tx.insert(changes).values({
      eventId: event.id,
      field: "created",
      newValue: { name: event.name, startDate: event.startDate, source: source.slug },
      sightingId: row.id,
      changedBy: "engine",
    });
    if (!event.publishedAt) {
      await tx.insert(reviews).values({
        kind: "new-event",
        eventId: event.id,
        sightingId: row.id,
        sourceId: source.id,
        note: `New from ${source.name}`,
      });
      openReviewSightings.add(row.id);
      report.queued++;
    }
    const seriesId = await seriesFor(tx, event);
    const final = seriesId
      ? (await tx.update(events).set({ seriesId }).where(eq(events.id, event.id)).returning())[0]!
      : event;
    eventById.set(final.id, final);
    eventOfSighting.set(row.id, final.id);
    addTo(linkedNames, final.id, row.name);
    addTo(linkedSources, final.id, source.id);
    return final;
  }

  /** The series an event belongs to, created for yearly kinds published by the organiser. */
  async function seriesFor(tx: Tx, event: Event): Promise<string | null> {
    const tokens = nameTokens(event.name).join(" ");
    const known = [...seriesById.values()].find(
      (row) =>
        nameTokens(row.name).join(" ") === tokens &&
        (!row.hostId || !event.hostId || row.hostId === event.hostId),
    );
    if (known) return known.id;
    if (!event.publishedAt || !YEARLY_KINDS.has(event.kind)) return null;
    const [created] = await tx
      .insert(series)
      .values({
        slug: uniqueSeriesSlug(slugify(event.name)),
        name: event.name,
        kind: event.kind,
        discipline: event.discipline,
        hostId: event.hostId,
        placeId: event.placeId,
        usualMonth: Number(event.startDate.slice(5, 7)),
      })
      .returning();
    seriesById.set(created!.id, created!);
    return created!.id;
  }

  /** Announced and confirmed events whose last day has passed. */
  async function markHeld() {
    for (const event of eventById.values()) {
      if (!event.publishedAt) continue;
      if (event.status !== "announced" && event.status !== "confirmed") continue;
      if (event.datePrecision !== "day") continue;
      if ((event.endDate ?? event.startDate) >= today) continue;
      await db.transaction(async (tx) => {
        const updated = await applyPatch(tx, event, { status: "held" }, { by: "engine" });
        eventById.set(event.id, updated);
      });
      report.held++;
    }
  }

  /** A series whose last edition is over and has nothing upcoming expects one next year. */
  async function predictNextEditions() {
    for (const row of seriesById.values()) {
      const editions = [...eventById.values()]
        .filter((event) => event.seriesId === row.id)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      const last = editions.at(-1);
      if (!last || !last.publishedAt) continue;
      if (lastDayOf({ startDate: last.startDate, endDate: last.endDate ?? undefined }) >= today) {
        continue;
      }
      const month = row.usualMonth ?? Number(last.startDate.slice(5, 7));
      let year = Number(last.startDate.slice(0, 4)) + 1;
      let start = `${year}-${String(month).padStart(2, "0")}-01`;
      while (addDays(addMonth(start), -1) < today) {
        year++;
        start = `${year}-${String(month).padStart(2, "0")}-01`;
      }
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(events)
          .values({
            slug: uniqueSlug(`${row.slug}-${year}`),
            name: row.name,
            kind: last.kind,
            discipline: last.discipline,
            status: "expected",
            startDate: start,
            datePrecision: "month",
            dateText: row.usualTiming || `Usually ${MONTHS[month - 1]}`,
            timezone: last.timezone,
            region: last.region,
            seriesId: row.id,
            placeId: last.placeId,
            placeText: last.placeText,
            hostId: last.hostId,
            summary: last.summary,
            url: last.url,
            sanctions: last.sanctions,
            classes: last.classes,
            requirements: last.requirements,
            confidence: 0.3,
            publishedAt: now,
          })
          .returning();
        await tx.insert(changes).values({
          eventId: created!.id,
          field: "created",
          newValue: { name: row.name, startDate: start, predictedFrom: last.slug },
          changedBy: "engine",
        });
        eventById.set(created!.id, created!);
      });
      report.predicted.push(`${row.name} ${year}`);
    }
  }

  function uniqueSlug(base: string): string {
    const root = slugify(base);
    let slug = root;
    for (let n = 2; slugs.has(slug); n++) slug = `${root}-${n}`;
    slugs.add(slug);
    return slug;
  }

  function uniqueSeriesSlug(base: string): string {
    const taken = new Set([...seriesById.values()].map((row) => row.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }
}

/**
 * Changes an event and writes one row per field in its history (the change log on its page and
 * the source of alerts). Used by resolve and by the crew's decisions.
 */
export async function applyPatch(
  tx: Tx,
  event: Event,
  patch: EventPatch,
  origin: { by: "engine" | "crew" | "organiser"; sightingId?: string },
): Promise<Event> {
  // Whatever the source of the change, an event never ends before it starts.
  const startDate = patch.startDate ?? event.startDate;
  const endDate = patch.endDate !== undefined ? patch.endDate : event.endDate;
  if (endDate && endDate < startDate) patch = { ...patch, endDate: null };
  const entries = Object.entries(patch).filter(
    ([field, value]) =>
      JSON.stringify(event[field as keyof EventPatch] ?? null) !== JSON.stringify(value ?? null),
  );
  if (!entries.length) return event;
  const [updated] = await tx
    .update(events)
    .set(Object.fromEntries(entries))
    .where(eq(events.id, event.id))
    .returning();
  await tx.insert(changes).values(
    entries.map(([field, value]) => ({
      eventId: event.id,
      field,
      oldValue: event[field as keyof EventPatch] ?? null,
      newValue: value ?? null,
      sightingId: origin.sightingId ?? null,
      changedBy: origin.by,
    })),
  );
  return updated!;
}

/** What a sighting would change in an event, field by field. */
export function proposePatch(event: Event, fields: SightingFields, organiser: boolean): EventPatch {
  if (event.status === "held") return {};
  const patch: EventPatch = {};
  const endDate = fields.endDate ?? null;
  if (
    event.datePrecision === "month" ||
    fields.startDate !== event.startDate ||
    endDate !== event.endDate
  ) {
    patch.startDate = fields.startDate;
    patch.endDate = endDate;
    if (event.datePrecision !== "day") patch.datePrecision = "day";
    if (event.dateText) patch.dateText = null;
  }
  if (fields.cancelled && event.status !== "cancelled") patch.status = "cancelled";
  else if (!fields.cancelled && event.status === "cancelled" && organiser)
    patch.status = "confirmed";
  else if (!fields.cancelled && event.status === "expected") {
    patch.status = organiser ? "confirmed" : "announced";
  } else if (!fields.cancelled && event.status === "announced" && organiser) {
    patch.status = "confirmed";
  }
  if (fields.url && !event.url) patch.url = fields.url;
  if (fields.entryFee && fields.entryFee !== event.entryFee) patch.entryFee = fields.entryFee;
  if (fields.entryUrl && fields.entryUrl !== event.entryUrl) patch.entryUrl = fields.entryUrl;
  if (fields.summary && !event.summary) patch.summary = fields.summary;
  if (fields.sanctions?.length && !sameList(fields.sanctions, event.sanctions)) {
    patch.sanctions = fields.sanctions;
  }
  if (fields.classes?.length && !sameList(fields.classes, event.classes)) {
    patch.classes = fields.classes;
  }
  return patch;
}

function candidateOf(
  event: Event,
  seriesById: Map<string, Series>,
  linkedNames: Map<string, Set<string>>,
): MatchCandidate {
  const seriesName = event.seriesId ? seriesById.get(event.seriesId)?.name : undefined;
  return {
    name: event.name,
    dates: {
      start: event.startDate,
      end: event.endDate,
      precision: event.datePrecision,
    },
    hostId: event.hostId,
    placeId: event.placeId,
    aliases: [...(seriesName ? [seriesName] : []), ...(linkedNames.get(event.id) ?? [])],
  };
}

function rangeOf(fields: SightingFields): DateRange {
  return { start: fields.startDate, end: fields.endDate ?? null, precision: "day" };
}

function lastDayOf(fields: { startDate: string; endDate?: string | undefined }): string {
  return fields.endDate && fields.endDate > fields.startDate ? fields.endDate : fields.startDate;
}

function addMonth(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCMonth(day.getUTCMonth() + 1);
  return day.toISOString().slice(0, 10);
}

/** The host a source names in its own words, when it's one we know. */
function hostFromText(text: string | undefined, all: Host[]): string | null {
  if (!text) return null;
  const wanted = text.trim().toLowerCase();
  const host = all.find(
    (candidate) =>
      candidate.name.toLowerCase() === wanted ||
      candidate.aliases.some((alias) => alias.toLowerCase() === wanted),
  );
  return host?.id ?? null;
}

/**
 * The place an entry happens at: one whose name (or alias) appears in the source's place text,
 * else the host's only place.
 */
function placeFor(text: string | undefined, hostId: string | null, all: Place[]): string | null {
  if (text) {
    const haystack = ` ${nameTokens(text).join(" ")} `;
    const named = all.find((place) =>
      [place.name, ...place.aliases].some((name) => {
        const needle = nameTokens(name).join(" ");
        return needle.split(" ").length >= 2 && haystack.includes(` ${needle} `);
      }),
    );
    if (named) return named.id;
  }
  if (hostId) {
    const own = all.filter((place) => place.hostId === hostId);
    if (own.length === 1) return own[0]!.id;
  }
  return null;
}

function trustRank(source: Source): number {
  return ["organiser", "sanctioning-body", "aggregator", "community"].indexOf(source.trust);
}

function rank(verdict: { kind: "same" | "maybe"; score: number }): number {
  return (verdict.kind === "same" ? 10 : 0) + verdict.score;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}
