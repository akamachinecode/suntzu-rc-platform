// The golden searches (docs/specs/0005-search.md): what visitors type and what must come first,
// run against a real PostgreSQL. Needs the local database (`pnpm db:up`); skipped without one,
// as in CI. It creates its own database, `servo_search_golden`, and drops it at the end.
//
// fixtures/documents.json is search_documents from the local database on 2026-10-28 with every
// event published (as the crew would after review), in a transaction that was rolled back;
// fixtures/gazetteer.json is the ZIP codes and the towns of fields and airports. "Today" is fixed
// so that upcoming and past don't change with the calendar.
import { existsSync, readFileSync } from "node:fs";
import { createDb, type Database, runMigrations, sql } from "@workspace/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  gazetteerFrom,
  listMisses,
  purgeMisses,
  recordMiss,
  refreshWords,
  runSearch,
} from "./search.js";

const TODAY = "2026-10-28";
// Right answers first today. Raise it when ranking improves; a change that lowers it fails.
const BASELINE = 36;

interface Golden {
  q: string;
  // A result's id or url; any of them counts.
  first?: string[];
  // Or: a result within 25 miles of the town or ZIP code.
  near?: true;
}

const MARKHAM = [
  "/places/markham-park",
  "/clubs/markham-park-pilots",
  "rule:broward-parks",
  "/places/markham-park-pilots-association-field-float-fly",
];
const HELI = [
  "guide:rc-helicopters",
  "/clubs/the-orlando-radio-control-helicopter-society",
  "/places/the-orlando-radio-control-helicopter-society-field",
];
const JETS_OVER = ["/events/jets-over-deland-2026", "/events/jets-over-miami-2026"];
const FLY_INS = [
  ...JETS_OVER,
  "/events/aerofest-2026",
  "/events/3d-over-the-glades-2027",
  "/events/jacksonville-jet-madness-2027",
];

const GOLDEN: Golden[] = [
  // Names
  { q: "aerofest", first: ["/events/aerofest-2026"] },
  { q: "jets over miami", first: ["/events/jets-over-miami-2026"] },
  { q: "markham park", first: MARKHAM },
  { q: "snowbird nationals", first: ["/events/snowbird-nationals-2027"] },
  {
    q: "sarasota silent flyers",
    first: ["/clubs/sarasota-silent-flyers", "/places/sarasota-silent-flyers-field"],
  },
  { q: "coral springs rc track", first: ["/places/coral-springs-rc-track"] },
  // Typos
  { q: "aerofst", first: ["/events/aerofest-2026"] },
  { q: "markam park", first: MARKHAM },
  { q: "jets ovr deland", first: ["/events/jets-over-deland-2026"] },
  { q: "snowbrid nationals", first: ["/events/snowbird-nationals-2027"] },
  { q: "corel springs track", first: ["/places/coral-springs-rc-track", "/events/sforcs"] },
  { q: "helicoptor", first: HELI },
  // Half-typed: the last word is unfinished
  { q: "aero", first: ["/events/aerofest-2026"] },
  { q: "jets ov", first: JETS_OVER },
  { q: "snowb", first: ["/events/snowbird-nationals-2027"] },
  { q: "mark", first: MARKHAM },
  { q: "jacksonville je", first: ["/events/jacksonville-jet-madness-2027"] },
  // Punctuation
  { q: "b&t raceway", first: ["/events/b-t-r-c-raceway-community-charity-race-nov-20-22-2026"] },
  {
    q: "ormond beach rc club",
    first: ["/clubs/ormond-beach-r-c-club", "/places/ormond-beach-r-c-club-field-nova-rd"],
  },
  {
    q: "dialed rc x",
    first: [
      "/events/dialed-rc-x-championship-round-2-2026",
      "/events/dialed-rc-x-championship-round-4-2027",
      "/events/dialed-rc-x-championship-round-5-2027",
      "/events/dialed-rc-x-championship-round-6-2027",
    ],
  },
  // The hobby's words
  { q: "heli", first: HELI },
  { q: "crawler", first: ["guide:cars-and-crawlers"] },
  {
    q: "1/8 scale",
    first: [
      "/events/jconcepts-florida-rc-championship-8th-scale-round-4-hosted-by-gateway-rc-park-20",
      "/events/jconcepts-florida-rc-championship-8th-scale-round-5-hosted-by-callahan-2026",
      "/events/jconcepts-florida-rc-championship-8th-scale-finals-hosted-by-triple-nickel-rc-pa",
    ],
  },
  { q: "fpv", first: ["/clubs/fpv-freedom-coalition", "/places/fpv-freedom-coalition-orlando"] },
  { q: "car track", first: ["/places/coral-springs-rc-track", "/places/west-delray-car-track"] },
  { q: "fly in", first: FLY_INS },
  // Questions
  { q: "do i need to register my plane", first: ["rule:register"] },
  { q: "how high can i fly", first: ["rule:altitude"] },
  { q: "can i fly in miami dade parks", first: ["rule:miami-dade-parks"] },
  { q: "flying lessons", first: ["service:lessons"] },
  { q: "remote id", first: ["rule:remote-id", "guide:flying-legally"] },
  // Places
  { q: "orlando", near: true },
  { q: "33441", near: true },
  { q: "rc field near tampa", near: true },
  { q: "naples", near: true },
  { q: "events near miami", first: ["/events/aerofest-2026", "/events/jets-over-miami-2026"] },
];

function databaseUrl(): string | undefined {
  const file = new URL("../../.env", import.meta.url);
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);
  return process.env.DATABASE_URL;
}

async function reachable(url: string): Promise<boolean> {
  const { db, pool } = createDb(url);
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000),
    );
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    void pool.end();
  }
}

const url = databaseUrl();
const available = url !== undefined && (await reachable(url));

describe.runIf(available)("golden searches", () => {
  const name = "servo_search_golden";
  // A skipped describe still runs its body, so nothing here may assume the database exists.
  const testUrl = (url ?? "").replace(/\/[^/?]+(\?|$)/, `/${name}$1`);
  let admin: ReturnType<typeof createDb>;
  let test: ReturnType<typeof createDb>;
  let db: Database;
  const fixtures = new URL("./fixtures/", import.meta.url);
  const gazetteerRows = JSON.parse(readFileSync(new URL("gazetteer.json", fixtures), "utf8")) as {
    zips: [string, number, number][];
    towns: [string, number, number][];
  };
  const gazetteer = gazetteerFrom(
    gazetteerRows.zips.map(([zip, latitude, longitude]) => ({ zip, latitude, longitude })),
    gazetteerRows.towns.map(([city, latitude, longitude]) => ({ city, latitude, longitude })),
  );

  beforeAll(async () => {
    admin = createDb(url!);
    await admin.db.execute(sql.raw(`drop database if exists ${name} with (force)`));
    await admin.db.execute(sql.raw(`create database ${name}`));
    await runMigrations(testUrl);
    test = createDb(testUrl);
    db = test.db;
    const documents = JSON.parse(readFileSync(new URL("documents.json", fixtures), "utf8")) as {
      id: string;
      type: string;
      title: string;
      subtitle: string;
      body: string;
      url: string;
      latitude: number | null;
      longitude: number | null;
      startsOn: string | null;
      endsOn: string | null;
      weight: number;
    }[];
    await db.execute(sql`
      insert into search_documents (id, type, title, subtitle, body, url, latitude, longitude, starts_on, ends_on, weight)
      values ${sql.join(
        documents.map(
          (d) =>
            sql`(${d.id}, ${d.type}, ${d.title}, ${d.subtitle}, ${d.body}, ${d.url}, ${d.latitude}, ${d.longitude},
              ${d.startsOn}::date, ${d.endsOn}::date, ${d.weight})`,
        ),
        sql`, `,
      )}`);
    await refreshWords(db);
  }, 60_000);

  afterAll(async () => {
    await test?.pool.end();
    await admin.db.execute(sql.raw(`drop database if exists ${name} with (force)`));
    await admin.pool.end();
  });

  it(`puts the right answer first for at least ${BASELINE} of ${GOLDEN.length}`, async () => {
    const misses: string[] = [];
    for (const golden of GOLDEN) {
      const { results, partial } = await runSearch(db, gazetteer, { q: golden.q }, TODAY);
      const top = results[0];
      // A visitor's real search is answered, not just approached.
      if (partial) misses.push(`${golden.q} → only partial matches`);
      const right = golden.near
        ? top?.miles != null && top.miles <= 25
        : top !== undefined && (golden.first!.includes(top.id) || golden.first!.includes(top.url));
      if (!right) misses.push(`${golden.q} → ${top?.title ?? "nothing"}`);
    }
    const hits = GOLDEN.length - misses.length;
    expect({ hits, misses }).toEqual({ hits: Math.max(hits, BASELINE), misses });
  });

  it("puts past events below upcoming ones", async () => {
    const { results } = await runSearch(db, gazetteer, { q: "jets" }, "2026-11-20");
    const events = results.filter((result) => result.type === "event");
    const firstPast = events.findIndex((event) => event.past);
    expect(firstPast).toBeGreaterThan(0);
    expect(events.slice(firstPast).every((event) => event.past)).toBe(true);
  });

  it("keeps a town's results within the radius, closest first", async () => {
    for (const q of ["rc field near tampa", "pista de carros cerca de Hialeah", "33441"]) {
      for (const miles of [25, 100]) {
        const { results } = await runSearch(db, gazetteer, { q, miles }, TODAY);
        const distances = results.flatMap((result) =>
          result.miles === null ? [] : [result.miles],
        );
        // Without a place on the map, only what holds anywhere.
        expect(
          results.filter((result) => result.miles === null).map((result) => result.type),
        ).not.toContainEqual(expect.stringMatching(/^(event|place|club)$/));
        expect(distances.length, `${q} within ${miles}`).toBeGreaterThan(0);
        expect(distances.every((each) => each <= miles)).toBe(true);
        if (!results.some((result) => result.past)) {
          expect(distances).toEqual([...distances].sort((a, b) => a - b));
        }
      }
    }
  });

  it("shows only the kinds of result a tab asks for", async () => {
    const learn = ["guide", "rule", "service"] as const;
    const { results } = await runSearch(db, gazetteer, { q: "markham", type: [...learn] }, TODAY);
    expect(results.map((result) => result.id)).toContain("rule:broward-parks");
    expect(results.every((result) => (learn as readonly string[]).includes(result.type))).toBe(
      true,
    );
  });

  it("points a past event to its next edition", async () => {
    const [series] = (
      await db.execute<{ id: string }>(sql`
        insert into series (slug, name, kind, discipline) values ('golden-open', 'Golden Open', 'race', 'ground')
        returning id`)
    ).rows;
    await db.execute(sql`
      insert into events (slug, name, kind, discipline, start_date, region, series_id, published_at)
      values ('golden-open-2025', 'Golden Open 2025', 'race', 'ground', '2025-11-08', 'florida', ${series!.id}, now()),
        ('golden-open-2026', 'Golden Open 2026', 'race', 'ground', '2026-11-14', 'florida', ${series!.id}, now())`);
    const { results } = await runSearch(db, gazetteer, { q: "golden open" }, TODAY);
    const last = results.find((result) => result.url === "/events/golden-open-2025");
    expect(last).toMatchObject({
      past: true,
      next: { url: "/events/golden-open-2026", startsOn: "2026-11-14", endsOn: "2026-11-14" },
    });
    expect(results.find((result) => result.url === "/events/golden-open-2026")?.next).toBeNull();
  });

  it("says when no result has every word", async () => {
    const loose = await runSearch(db, gazetteer, { q: "markham hovertank" }, TODAY);
    expect(loose.results.length).toBeGreaterThan(0);
    expect(loose.partial).toBe(true);
    expect((await runSearch(db, gazetteer, { q: "markam park" }, TODAY)).partial).toBe(false);
  });

  it("counts searches without results anonymously and forgets them after 90 days", async () => {
    expect(await recordMiss(db, gazetteer, "qwxzv jkqpl", TODAY)).toBe(true);
    expect(await recordMiss(db, gazetteer, "  QWXZV jkqpl! ", TODAY)).toBe(true);
    // Only partial matches count too.
    expect(await recordMiss(db, gazetteer, "markham hovertank", TODAY)).toBe(true);
    // Found, or personal: never counted.
    expect(await recordMiss(db, gazetteer, "markham park", TODAY)).toBe(false);
    expect(await recordMiss(db, gazetteer, "qwxzv@example.com", TODAY)).toBe(false);
    expect(await recordMiss(db, gazetteer, "1200 Qwxzv Ave", TODAY)).toBe(false);
    expect(await listMisses(db, TODAY)).toEqual([
      { words: "qwxzv jkqpl", searches: 2, results: 0, lastOn: TODAY },
      { words: "markham hovertank", searches: 1, results: expect.any(Number), lastOn: TODAY },
    ]);

    expect(await purgeMisses(db, "2027-01-25")).toBe(0);
    expect(await listMisses(db, "2027-01-26")).toEqual([]);
    expect(await purgeMisses(db, "2027-01-26")).toBe(2);
  });

  it("keeps search in step with events, places and clubs", async () => {
    const find = async (q: string) => (await runSearch(db, gazetteer, { q }, TODAY)).results;
    const [host] = (
      await db.execute<{ id: string }>(sql`
        insert into hosts (slug, name, kind) values ('golden-gliders', 'Golden Gliders', 'club') returning id`)
    ).rows;
    const [place] = (
      await db.execute<{ id: string }>(sql`
        insert into places (slug, name, kind, host_id, city, latitude, longitude)
        values ('golden-field', 'Golden Field', 'flying-field', ${host!.id}, 'Sebring', 27.5, -81.4) returning id`)
    ).rows;
    await db.execute(sql`
      insert into events (slug, name, kind, discipline, start_date, region, place_id, host_id, published_at)
      values ('golden-glide-in', 'Golden Glide-In', 'fly-in', 'air', '2026-12-01', 'florida', ${place!.id}, ${host!.id}, now())`);

    expect((await find("golden glide")).map((r) => r.url)).toContain("/events/golden-glide-in");
    expect((await find("golden gliders"))[0]).toMatchObject({
      url: "/clubs/golden-gliders",
      type: "club",
    });

    // A renamed place shows on its event at once.
    await db.execute(sql`update places set name = 'Sunny Strip' where id = ${place!.id}`);
    const [event] = (await find("golden glide")).filter((r) => r.url === "/events/golden-glide-in");
    expect(event?.subtitle).toContain("Sunny Strip");

    // A rejected event disappears; an unpublished one never appears.
    await db.execute(sql`update events set rejected_at = now() where slug = 'golden-glide-in'`);
    expect((await find("golden glide")).map((r) => r.url)).not.toContain("/events/golden-glide-in");

    await db.execute(sql`delete from places where id = ${place!.id}`);
    expect((await find("sunny strip")).map((r) => r.url)).not.toContain("/places/golden-field");
  });
});
