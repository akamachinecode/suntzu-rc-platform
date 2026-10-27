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

try {
  const alerts = await sendAlerts(db, now);
  const digests = asked.has("digest") || today.getUTCDay() === 4 ? await sendDigests(db, now) : 0;
  const reports = asked.has("report") || today.getUTCDate() === 1 ? await sendReports(db, now) : 0;
  const purged = await purge(db, now);
  console.log(
    `notify: ${alerts} change alerts, ${digests} weekly digests, ${reports} organiser reports; ${purged} old messages deleted`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
