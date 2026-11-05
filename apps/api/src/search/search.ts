// Search across the whole site (docs/specs/0005-search.md). The words go through PostgreSQL's
// full-text search (title > subtitle > text), misspellings are corrected against every word on
// the site (search_words) and caught on titles by trigram similarity, and a town or ZIP code
// adds closeness. See DECISIONS.md (2026-10-28) for why this runs in PostgreSQL. No Nest here,
// so the golden searches (golden.test.ts) run it against their own database.
import {
  type SearchMiss,
  type SearchQuery,
  type SearchResponse,
  type SearchResult,
  type SearchType,
} from "@workspace/shared";
import { type Database, sql } from "@workspace/db";
import { contentDocuments } from "./content.js";
import {
  type Gazetteer,
  looksPersonal,
  normalise,
  parseQuery,
  type Point,
  synonymsOf,
} from "./query.js";

const METRES_PER_MILE = 1609.344;
const DEFAULT_MILES = 25;
const DEFAULT_LIMIT = 10;
// Searches that found nothing are kept this long, then deleted (spec 0005, privacy).
const MISS_DAYS = 90;
// Guides, rules and services hold anywhere; an event, place or club without a place on the map
// can't be "near" a town, so a search near one leaves it out.
const EVERYWHERE: readonly SearchType[] = ["guide", "rule", "service"];

interface Row extends Record<string, unknown> {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  url: string;
  starts_on: string | null;
  ends_on: string | null;
  miles: number | null;
}

/** Writes guides, rules and services to search_documents and removes the ones that are gone. */
export async function syncContent(db: Database): Promise<void> {
  const docs = contentDocuments();
  for (const doc of docs) {
    await db.execute(sql`
      insert into search_documents (id, type, title, subtitle, body, url, weight, updated_at)
      values (${doc.id}, ${doc.type}, ${doc.title}, ${doc.subtitle}, ${doc.body}, ${doc.url}, ${doc.weight}, now())
      on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle,
        body = excluded.body, url = excluded.url, weight = excluded.weight, updated_at = now()
        where (search_documents.title, search_documents.subtitle, search_documents.body, search_documents.url,
          search_documents.weight) is distinct from (excluded.title, excluded.subtitle, excluded.body,
          excluded.url, excluded.weight)`);
  }
  await db.execute(sql`
    delete from search_documents where type in ('guide', 'rule', 'service')
      and id not in (${sql.join(
        docs.map((doc) => sql`${doc.id}`),
        sql`, `,
      )})`);
}

/** Re-reads every word on the site, without making searches wait. */
export async function refreshWords(db: Database): Promise<void> {
  await db.execute(sql`refresh materialized view concurrently search_words`);
}

/** Florida's ZIP codes and the towns of its fields and airports, from the census. */
export async function loadGazetteer(db: Database): Promise<Gazetteer> {
  const zips = await db.execute<{ zip: string; latitude: number; longitude: number }>(
    sql`select zip, latitude, longitude from zip_codes`,
  );
  const towns = await db.execute<{ city: string; latitude: number; longitude: number }>(sql`
    select city, latitude, longitude from places where city is not null and latitude is not null
    union all
    select city, latitude, longitude from airports where city is not null and state = 'FL'`);
  return gazetteerFrom(zips.rows, towns.rows);
}

export function gazetteerFrom(
  zips: { zip: string; latitude: number; longitude: number }[],
  towns: { city: string; latitude: number; longitude: number }[],
): Gazetteer {
  const byZip = new Map(
    zips.map((row) => [row.zip, { latitude: row.latitude, longitude: row.longitude }]),
  );
  const sums = new Map<string, { label: string; lat: number; lng: number; n: number }>();
  for (const row of towns) {
    const key = normalise(row.city);
    if (!key) continue;
    const sum = sums.get(key) ?? { label: titleCase(row.city), lat: 0, lng: 0, n: 0 };
    sum.lat += row.latitude;
    sum.lng += row.longitude;
    sum.n += 1;
    sums.set(key, sum);
  }
  const byTown = new Map<string, { label: string; point: Point }>();
  for (const [key, sum] of sums) {
    const town = {
      label: sum.label,
      point: { latitude: sum.lat / sum.n, longitude: sum.lng / sum.n },
    };
    byTown.set(key, town);
    // "St. Petersburg" or "Saint Petersburg", "Ft Myers" or "Fort Myers".
    for (const [short, long] of [
      ["st ", "saint "],
      ["ft ", "fort "],
    ] as const) {
      if (key.startsWith(short)) byTown.set(long + key.slice(short.length), town);
      if (key.startsWith(long)) byTown.set(short + key.slice(long.length), town);
    }
  }
  return { zip: (code) => byZip.get(code), town: (name) => byTown.get(name) };
}

const titleCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toUpperCase());

/** One search: what it means, the matches, then what is nearby. `today` is a Florida date. */
export async function runSearch(
  db: Database,
  gazetteer: Gazetteer,
  query: SearchQuery,
  today: string,
): Promise<SearchResponse> {
  const parsed = parseQuery(query.q, gazetteer);
  const types = query.type ?? (parsed.type ? [parsed.type] : null);
  const limit = query.limit ?? DEFAULT_LIMIT;
  const miles = query.miles ?? DEFAULT_MILES;
  const near = parsed.near;
  const typeFilter = types
    ? sql`and d.type in (${sql.join(
        types.map((type) => sql`${type}`),
        sql`, `,
      )})`
    : sql``;
  const distance = near
    ? sql`earth_distance(ll_to_earth(${near.point.latitude}, ${near.point.longitude}), ll_to_earth(d.latitude, d.longitude))`
    : null;
  // Near a town or ZIP code: within the radius, or something that holds anywhere.
  const withinRadius = distance
    ? sql`and case when d.latitude is null then d.type in (${sql.join(
        EVERYWHERE.map((type) => sql`${type}`),
        sql`, `,
      )}) else ${distance} <= ${miles * METRES_PER_MILE} end`
    : sql``;
  const milesColumn = distance
    ? sql`case when d.latitude is null then null else ${distance} / ${METRES_PER_MILE} end`
    : sql`null::float8`;
  const columns = sql`d.id, d.type, d.title, d.subtitle, d.url, d.starts_on::text as starts_on,
    d.ends_on::text as ends_on, ${milesColumn} as miles`;

  const found: Row[] = [];
  const add = (rows: Row[]) => {
    for (const row of rows) if (!found.some((seen) => seen.id === row.id)) found.push(row);
  };

  if (parsed.pinned.length) {
    const pinned = await db.execute<Row>(sql`
      select ${columns} from search_documents d
      where d.id in (${sql.join(
        parsed.pinned.map((id) => sql`${id}`),
        sql`, `,
      )}) ${typeFilter}`);
    add(parsed.pinned.flatMap((id) => pinned.rows.filter((row) => row.id === id)));
  }

  // Results that have every word (after correcting typos), or that answer the question outright.
  let whole = parsed.pinned.length;
  if (parsed.words.length) {
    const words = await correct(db, parsed.words);
    const text = words.join(" ");
    const groups = words.map((word, at) => {
      const last = at === words.length - 1;
      return `(${synonymsOf(word)
        .map((each) => (last ? `${each}:*` : each))
        .join(" | ")})`;
    });
    const geo = distance
      ? sql`case when d.latitude is null then 0 else 0.3 * exp(-(${distance} / 1000) / 30) end`
      : sql`0`;
    const match = async (operator: " & " | " | ") =>
      db.execute<Row>(sql`
        with q as (select to_tsquery('english', ${groups.join(operator)}) as q)
        select ${columns},
          ts_rank(d.tsv, q.q)
            + case when d.tsv @@ q.q then 0.3 else 0 end
            + 0.6 * word_similarity(${text}, d.title_norm)
            + 0.04 * case when d.type = 'event' and d.ends_on < ${today}::date then 0 else d.weight end
            + ${geo} as score
        from search_documents d, q
        where (d.tsv @@ q.q or ${text} <% d.title_norm) ${typeFilter} ${withinRadius}
        order by score desc, d.starts_on nulls last, length(d.title_norm), d.title
        limit ${limit}`);
    // Every word first; if that finds almost nothing, any of them.
    const every = (await match(" & ")).rows;
    whole += every.length;
    add(every);
    if (found.length < 3) add((await match(" | ")).rows);
  }

  if (near && distance && found.length < limit) {
    const nearby = await db.execute<Row>(sql`
      select ${columns} from search_documents d
      where d.latitude is not null ${typeFilter} and ${distance} <= ${miles * METRES_PER_MILE}
      order by ${distance}
      limit ${limit}`);
    add(nearby.rows);
  }

  const inRadius = near
    ? found.filter((row) =>
        row.miles === null ? EVERYWHERE.includes(row.type) : Number(row.miles) <= miles,
      )
    : found;
  const ranked = inRadius.slice(0, limit).map((row) => toResult(row, today));
  const results = upcomingFirst(near ? closestFirst(ranked) : ranked);
  await addNextEditions(db, results, today);
  return {
    q: query.q,
    near: near && { label: near.label, ...near.point, miles },
    results,
    partial: parsed.words.length > 0 && whole === 0 && results.length > 0,
  };
}

/** Corrects each word to the closest word on the site; the last one may be unfinished. */
async function correct(db: Database, words: string[]): Promise<string[]> {
  const { rows } = await db.execute<{ word: string }>(sql`
    select coalesce(
      (select t.word where length(t.word) < 3
        or exists (select 1 from search_words where word = t.word)
        or (t.n = ${words.length} and exists (select 1 from search_words where word like t.word || '%'))),
      (select w.word from search_words w where w.word % t.word
        order by similarity(w.word, t.word) desc, levenshtein(w.word, t.word), w.ndoc desc, w.word limit 1),
      t.word) as word
    from unnest(string_to_array(${words.join(" ")}, ' ')) with ordinality as t(word, n)
    order by t.n`);
  return rows.map((row) => row.word);
}

function toResult(row: Row, today: string): SearchResult {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    url: row.url,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    past: row.type === "event" && row.ends_on !== null && row.ends_on < today,
    miles: row.miles === null ? null : Math.round(Number(row.miles) * 10) / 10,
    next: null,
  };
}

/** A past event points to the next edition of its series, when that one is on the calendar. */
async function addNextEditions(
  db: Database,
  results: SearchResult[],
  today: string,
): Promise<void> {
  const past = results.filter((result) => result.past);
  if (!past.length) return;
  const { rows } = await db.execute<{
    id: string;
    title: string;
    url: string;
    starts_on: string;
    ends_on: string;
  }>(
    sql`
    select 'event:' || e.id as id, n.name as title, '/events/' || n.slug as url,
      n.start_date::text as starts_on,
      (case when n.date_precision = 'month'
        then n.start_date + interval '1 month' - interval '1 day'
        else coalesce(n.end_date, n.start_date) end)::date::text as ends_on
    from events e
    join lateral (
      select name, slug, start_date, end_date, date_precision from events n
      where n.series_id = e.series_id and n.id <> e.id and n.start_date >= ${today}::date
        and n.published_at is not null and n.rejected_at is null
      order by n.start_date limit 1) n on true
    where 'event:' || e.id in (${sql.join(
      past.map((result) => sql`${result.id}`),
      sql`, `,
    )})`,
  );
  for (const result of past) {
    const next = rows.find((row) => row.id === result.id);
    if (next) {
      result.next = {
        title: next.title,
        url: next.url,
        startsOn: next.starts_on,
        endsOn: next.ends_on,
      };
    }
  }
}

/**
 * Counts a search that found nothing, or only partial matches, after searching again: the browser reports it,
 * but only the API's own answer counts. Only the normalised words and the number of results are
 * kept, per Florida day; text that looks like an email, a phone number or an address is dropped.
 */
export async function recordMiss(
  db: Database,
  gazetteer: Gazetteer,
  q: string,
  today: string,
): Promise<boolean> {
  const words = normalise(q);
  if (!words || looksPersonal(q)) return false;
  const { results, partial } = await runSearch(db, gazetteer, { q }, today);
  if (results.length && !partial) return false;
  await db.execute(sql`
    insert into search_misses (day, words, results) values (${today}::date, ${words}, ${results.length})
    on conflict (day, words) do update
      set count = search_misses.count + 1, results = excluded.results`);
  return true;
}

/** The crew's list: the most frequent searches without results in the last 90 days. */
export async function listMisses(db: Database, today: string): Promise<SearchMiss[]> {
  const { rows } = await db.execute<{
    words: string;
    searches: number;
    results: number;
    last_on: string;
  }>(sql`
    select words, sum(count)::int as searches, (array_agg(results order by day desc))[1] as results,
      max(day)::text as last_on
    from search_misses
    where day > ${today}::date - ${MISS_DAYS}::int
    group by words
    order by searches desc, last_on desc, words
    limit 50`);
  return rows.map((row) => ({
    words: row.words,
    searches: row.searches,
    results: row.results,
    lastOn: row.last_on,
  }));
}

/** Deletes the counts older than 90 days (the scheduled clean-up, `pnpm notify`). */
export async function purgeMisses(db: Database, today: string): Promise<number> {
  const { rows } = await db.execute<{ day: string }>(sql`
    delete from search_misses where day <= ${today}::date - ${MISS_DAYS}::int returning day`);
  return rows.length;
}

/** Near a town or ZIP code, what is on the map comes closest first; the rest keeps its place. */
function closestFirst(results: SearchResult[]): SearchResult[] {
  const located = results
    .filter((result) => result.miles !== null)
    .sort((a, b) => a.miles! - b.miles!);
  return results.map((result) => (result.miles === null ? result : located.shift()!));
}

/** Past events move below the upcoming ones; everything else keeps its place. */
function upcomingFirst(results: SearchResult[]): SearchResult[] {
  const events = results.filter((result) => result.type === "event");
  const ordered = [
    ...events.filter((event) => !event.past),
    ...events.filter((event) => event.past),
  ];
  return results.map((result) => (result.type === "event" ? ordered.shift()! : result));
}
