// Runs the places census once, from the command line: `pnpm census` loads every dataset (FAA
// recognised areas, fixed sites, airports, airspace, then ZIP codes), `pnpm census fria airports`
// only those. Safe to run again: nothing is added twice. See docs/bits/census.import.md.
import { createDb } from "@workspace/db";
import { env } from "./env.js";
import { CensusHttp } from "./places/census/http.js";
import { DATASETS, runDataset, type DatasetName } from "./places/census/run.js";

const asked = process.argv.slice(2);
const unknown = asked.filter((name) => !(DATASETS as readonly string[]).includes(name));
if (unknown.length) {
  console.error(`Unknown dataset ${unknown.join(", ")}. Choose from: ${DATASETS.join(", ")}`);
  process.exit(1);
}
// Always in the standard order: recognised areas before fixed sites, so a field that is both
// becomes one place listed as a FRIA.
const chosen = DATASETS.filter((name) => !asked.length || asked.includes(name)) as DatasetName[];

const { db, pool } = createDb(env.DATABASE_URL);
const http = new CensusHttp();
let failed = false;

try {
  for (const dataset of chosen) {
    const started = Date.now();
    try {
      const report = await runDataset(dataset, { db, http, now: new Date() });
      console.log(`${dataset} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
      for (const line of report.lines) console.log(line);
    } catch (error) {
      failed = true;
      console.error(`${dataset}: failed, nothing written: ${(error as Error).message}`);
    }
  }
  console.log(`${http.requests} requests`);
} finally {
  await pool.end();
}
process.exitCode = failed ? 1 : 0;
