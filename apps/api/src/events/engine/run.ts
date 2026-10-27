import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { and, desc, eq, isNotNull, type Database } from "@workspace/db";
import { fetches, sightings, sources, type Source } from "@workspace/db/schema";
import { discipline, type Sighting } from "@workspace/shared";
import { z } from "zod";
import type { Page, PoliteFetcher } from "./fetcher.js";
import { readIcs } from "./ics.js";
import { findLinks, readJsonLd } from "./json-ld.js";
import { fingerprint, onlyPlaces, type ReadContext, type ReadResult } from "./read.js";
import { readScheduleTable } from "./schedule-table.js";
import { readTheEventsCalendar } from "./the-events-calendar.js";
import { readWildApricot } from "./wild-apricot.js";

// One run of one source: fetch → keep a snapshot → read → store sightings. Merging sightings
// into events (resolve) is the next step of the engine and doesn't happen here.

type Reader = (body: string, pageUrl: string, context: ReadContext) => ReadResult;

/**
 * Readers for `api` and `html` sources, by the platform the site runs on. A platform that
 * already publishes ICS or schema.org data needs no reader of its own: its sources use the
 * `ics` or `json-ld` adapter, and `platform` only records what the site runs on.
 */
export const PLATFORM_READERS: Record<string, { adapter: "api" | "html"; read: Reader }> = {
  // WordPress + The Events Calendar: /wp-json/tribe/events/v1/events.
  "the-events-calendar": { adapter: "api", read: readTheEventsCalendar },
  // Wild Apricot's events feed: /events/RSS.
  "wild-apricot": { adapter: "api", read: readWildApricot },
  // A table of date | name | town under a year heading (Extreme Flight's schedule).
  "schedule-table": { adapter: "html", read: readScheduleTable },
};

const pattern = z.string().refine((value) => {
  try {
    return Boolean(new RegExp(value));
  } catch {
    return false;
  }
}, "Not a regular expression");

/** Adapter settings kept in `sources.config`. */
export const sourceConfig = z.looseObject({
  /** What to read when it isn't the source's own URL: an ICS link, an API, an RSS feed. */
  feedUrl: z.url().optional(),
  /** What the site runs on (wix, dualrates…). For `api` and `html` sources it picks the reader. */
  platform: z.string().optional(),
  discipline: discipline.optional(),
  /** JSON-LD sources: follow links whose path matches this pattern (event pages). */
  followLinks: pattern.optional(),
  /** Keep only sightings whose place matches this pattern (",\\s*FL$" for Florida). */
  onlyPlaces: pattern.optional(),
  /** Pages read per run: followed links, or an API's pages. */
  maxPages: z.number().int().positive().max(100).default(20),
  timezone: z.string().default("America/New_York"),
});

export interface RunReport {
  source: string;
  pages: number;
  notModified: number;
  found: number;
  added: { name: string; startDate: string }[];
  unchanged: number;
  skipped: Partial<Record<string, number>>;
  errors: string[];
}

export interface RunOptions {
  fetcher: PoliteFetcher;
  /** Where raw responses are kept. Local disk for now; Amazon S3 once deployed. */
  snapshotDir: string;
  now?: Date;
}

export async function runSource(
  db: Database,
  source: Source,
  options: RunOptions,
): Promise<RunReport> {
  const now = options.now ?? new Date();
  const report: RunReport = {
    source: source.slug,
    pages: 0,
    notModified: 0,
    found: 0,
    added: [],
    unchanged: 0,
    skipped: {},
    errors: [],
  };
  const config = sourceConfig.safeParse(source.config);
  if (!config.success) {
    report.errors.push(`Invalid config: ${z.prettifyError(config.error)}`);
    return report;
  }
  const context: ReadContext = {
    timezone: config.data.timezone,
    ...(config.data.discipline && { discipline: config.data.discipline }),
  };
  const area = config.data.onlyPlaces ? new RegExp(config.data.onlyPlaces) : undefined;

  /** Fetches one URL, records it, keeps a snapshot. Undefined when there is nothing to read. */
  async function load(
    url: string,
    conditional: boolean,
  ): Promise<{ page: Page; fetchId: string } | undefined> {
    const [previous] = await db
      .select()
      .from(fetches)
      .where(
        and(eq(fetches.sourceId, source.id), eq(fetches.url, url), isNotNull(fetches.contentHash)),
      )
      .orderBy(desc(fetches.fetchedAt))
      .limit(1);
    const outcome = await options.fetcher.get(
      url,
      conditional && previous
        ? {
            ...(previous.etag && { etag: previous.etag }),
            ...(previous.lastModified && { lastModified: previous.lastModified }),
          }
        : {},
    );
    if (!outcome.ok) {
      await db.insert(fetches).values({
        sourceId: source.id,
        url,
        fetchedAt: now,
        httpStatus: outcome.status ?? null,
        error: outcome.error,
      });
      report.errors.push(`${url}: ${outcome.error}`);
      return undefined;
    }
    const { page } = outcome;
    report.pages++;
    if (page.status === 304) {
      // Not modified: read our own copy again, so what it says counts as seen today.
      const body = previous?.snapshotKey
        ? await readSnapshot(options.snapshotDir, previous.snapshotKey)
        : undefined;
      if (!previous || body === undefined) return load(url, false);
      report.notModified++;
      const [saved] = await db
        .insert(fetches)
        .values({
          sourceId: source.id,
          url,
          fetchedAt: now,
          httpStatus: 304,
          contentType: previous.contentType,
          contentHash: previous.contentHash,
          etag: previous.etag,
          lastModified: previous.lastModified,
          snapshotKey: previous.snapshotKey,
          durationMs: page.durationMs,
        })
        .returning({ id: fetches.id });
      return { page: { ...page, body }, fetchId: saved!.id };
    }
    const contentHash = createHash("sha256").update(page.body).digest("hex");
    // Same bytes as last time: point at the snapshot we already have.
    const snapshotKey =
      previous?.contentHash === contentHash && previous.snapshotKey
        ? previous.snapshotKey
        : await saveSnapshot(
            options.snapshotDir,
            source.slug,
            page.body,
            page.contentType,
            contentHash,
            now,
          );
    const [saved] = await db
      .insert(fetches)
      .values({
        sourceId: source.id,
        url,
        fetchedAt: now,
        httpStatus: page.status,
        contentType: page.contentType ?? null,
        contentHash,
        etag: page.etag ?? null,
        lastModified: page.lastModified ?? null,
        snapshotKey,
        durationMs: page.durationMs,
      })
      .returning({ id: fetches.id });
    return { page, fetchId: saved!.id };
  }

  async function store(read: ReadResult, fetchId: string) {
    const result = area ? onlyPlaces(read, area) : read;
    for (const [reason, count] of countBy(result.skipped.map((s) => s.reason))) {
      report.skipped[reason] = (report.skipped[reason] ?? 0) + count;
    }
    report.found += result.sightings.length;
    for (const found of result.sightings) await storeSighting(found, fetchId);
  }

  async function storeSighting({ externalId, fields, evidence }: Sighting, fetchId: string) {
    const [row] = await db
      .insert(sightings)
      .values({
        sourceId: source.id,
        fetchId,
        externalId,
        fingerprint: fingerprint(fields),
        name: fields.name,
        startDate: fields.startDate,
        endDate: fields.endDate ?? null,
        fields,
        evidence,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [sightings.sourceId, sightings.externalId, sightings.fingerprint],
        set: { lastSeenAt: now },
      })
      .returning({ firstSeenAt: sightings.firstSeenAt });
    if (row!.firstSeenAt.getTime() === now.getTime()) {
      report.added.push({ name: fields.name, startDate: fields.startDate });
    } else {
      report.unchanged++;
    }
  }

  if (source.adapter === "ics") {
    const loaded = await load(config.data.feedUrl ?? source.url, true);
    if (loaded) await store(readIcs(loaded.page.body, context), loaded.fetchId);
  } else if (source.adapter === "json-ld") {
    // The listing page is always read in full: it is where new event pages show up.
    const listing = await load(source.url, false);
    if (listing) {
      await store(readJsonLd(listing.page.body, listing.page.url, context), listing.fetchId);
      const pattern = config.data.followLinks && new RegExp(config.data.followLinks);
      const links = pattern ? findLinks(listing.page.body, listing.page.url, pattern) : [];
      for (const link of links.slice(0, config.data.maxPages)) {
        const loaded = await load(link, true);
        if (loaded)
          await store(readJsonLd(loaded.page.body, loaded.page.url, context), loaded.fetchId);
      }
    }
  } else if (source.adapter === "api" || source.adapter === "html") {
    const platform = config.data.platform;
    const reader =
      platform && Object.hasOwn(PLATFORM_READERS, platform)
        ? PLATFORM_READERS[platform]
        : undefined;
    if (!reader || reader.adapter !== source.adapter) {
      report.errors.push(`No ${source.adapter} reader for platform "${platform ?? "(none)"}" yet`);
    } else {
      // An API answers a page at a time: follow its next page, up to maxPages.
      let url: string | undefined = config.data.feedUrl ?? source.url;
      for (let page = 0; url && page < config.data.maxPages; page++) {
        const loaded = await load(url, true);
        if (!loaded) break;
        const result = reader.read(loaded.page.body, loaded.page.url, context);
        await store(result, loaded.fetchId);
        url = result.next;
      }
    }
  } else {
    report.errors.push(`No reader for "${source.adapter}" sources yet`);
  }

  const succeeded = report.pages > 0;
  await db
    .update(sources)
    .set({
      lastFetchedAt: now,
      ...(succeeded
        ? { lastSuccessAt: now, consecutiveFailures: 0 }
        : { consecutiveFailures: source.consecutiveFailures + 1 }),
    })
    .where(eq(sources.id, source.id));
  return report;
}

async function saveSnapshot(
  dir: string,
  sourceSlug: string,
  body: string,
  contentType: string | undefined,
  hash: string,
  now: Date,
): Promise<string> {
  const extension = contentType?.includes("calendar")
    ? "ics"
    : contentType?.includes("json")
      ? "json"
      : /\b(text|application)\/(rss\+)?xml\b/.test(contentType ?? "")
        ? "xml"
        : "html";
  const key = `${sourceSlug}/${now.toISOString().replace(/[:.]/g, "-")}-${hash.slice(0, 12)}.${extension}`;
  const path = join(dir, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  return key;
}

async function readSnapshot(dir: string, key: string): Promise<string | undefined> {
  try {
    return await readFile(join(dir, key), "utf8");
  } catch {
    return undefined; // snapshots stay on the machine that fetched them
  }
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
