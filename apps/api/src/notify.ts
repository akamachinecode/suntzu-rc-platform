// Sends Servo's own emails once, from the command line (`pnpm notify`), and on a schedule once
// deployed: change alerts and the clean-up every run, the weekly digest on Thursdays and the
// organisers' report on the first of the month. `pnpm notify digest report` sends those now.
import { createDb } from "@workspace/db";
import { env } from "./env.js";
import { localDate } from "./events/engine/read.js";
import { purge, sendAlerts, sendDigests, sendReports } from "./notify/notify.js";

const asked = new Set(process.argv.slice(2));
const now = new Date();
const today = new Date(`${localDate(now, "America/New_York")}T12:00:00Z`);
const { db, pool } = createDb(env.DATABASE_URL);

// Each part runs on its own: one failing doesn't stop the others.
async function step(name: string, run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch (error) {
    console.error(`notify: ${name} failed`, error);
    process.exitCode = 1;
    return 0;
  }
}

try {
  const alerts = await step("alerts", () => sendAlerts(db, now));
  const digests =
    asked.has("digest") || today.getUTCDay() === 4
      ? await step("digest", () => sendDigests(db, now))
      : 0;
  const reports =
    asked.has("report") || today.getUTCDate() === 1
      ? await step("reports", () => sendReports(db, now))
      : 0;
  const purged = await step("purge", () => purge(db, now));
  console.log(
    `notify: ${alerts} change alerts, ${digests} weekly digests, ${reports} organiser reports; ${purged} old messages and searches deleted`,
  );
} finally {
  await pool.end();
}
