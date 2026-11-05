// Runs the events engine once, from the command line: `pnpm engine` reads every active source,
// `pnpm engine amps-events deland-rc-calendar` reads only those (candidates included, so a
// source can be tried before it is turned on). Blocked sources are never read.
import { createDb, eq, inArray } from "@workspace/db";
import { sources } from "@workspace/db/schema";
import { env } from "./env.js";
import { PoliteFetcher } from "./events/engine/fetcher.js";
import { runSource } from "./events/engine/run.js";

const slugs = process.argv.slice(2);
const { db, pool } = createDb(env.DATABASE_URL);
const fetcher = new PoliteFetcher();
let failed = false;

try {
  const chosen = slugs.length
    ? await db.select().from(sources).where(inArray(sources.slug, slugs))
    : await db.select().from(sources).where(eq(sources.status, "active"));

  for (const slug of slugs.filter((slug) => !chosen.some((source) => source.slug === slug))) {
    console.error(`Unknown source "${slug}"`);
    failed = true;
  }
  if (!chosen.length && !slugs.length)
    console.log("No active sources. Name one: pnpm engine <slug>");

  for (const source of chosen) {
    if (source.status === "blocked") {
      console.log(`${source.slug}: blocked, not read (${source.permission})`);
      continue;
    }
    const report = await runSource(db, source, { fetcher, snapshotDir: env.ENGINE_SNAPSHOT_DIR });
    const skipped = Object.entries(report.skipped)
      .map(([reason, count]) => `${count} ${reason}`)
      .join(", ");
    console.log(
      `${report.source}: ${report.pages} pages (${report.notModified} unchanged), ` +
        `${report.found} events found, ${report.added.length} new, ${report.unchanged} already known` +
        (skipped ? `; skipped ${skipped}` : ""),
    );
    for (const event of report.added) console.log(`  + ${event.startDate} ${event.name}`);
    for (const error of report.errors) console.log(`  ! ${error}`);
    if (report.errors.length) failed = true;
  }
} finally {
  await pool.end();
}
process.exitCode = failed ? 1 : 0;
