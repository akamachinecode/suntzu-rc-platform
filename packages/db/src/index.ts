import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema/index.js";

export { schema };
export * from "drizzle-orm";

/** Creates the connection pool and the typed Drizzle client. One per process. */
export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  // An idle connection closed by the server (database restart, failover, maintenance) is replaced
  // on the next query. Without this listener the error would stop the whole process.
  pool.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: `Idle database connection lost: ${error.message}`,
      }),
    );
  });
  return { db: drizzle(pool, { schema }), pool };
}

export type Database = ReturnType<typeof createDb>["db"];

/** Applies pending SQL migrations from packages/db/migrations. Safe to run on every start. */
export async function runMigrations(url: string): Promise<void> {
  const { db, pool } = createDb(url);
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}
