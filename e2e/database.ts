// Prepares the end-to-end tests' own database before the API starts (playwright.config.ts): drops and
// creates it in the local PostgreSQL (`pnpm db:up`), then runs the migrations and loads the starting
// data (`db:seed`) and a few ZIP codes, so every run starts from the same state. Also empties the
// test mailbox.
// The developer's own database (`app`) is never touched.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { ZIP_CODES } from "./data.ts";
import { DATABASE_URL, MAIL_DIR } from "./env.ts";

const root = path.resolve(import.meta.dirname, "..");
const api = path.join(root, "apps", "api");
const name = new URL(process.env.DATABASE_URL ?? DATABASE_URL).pathname.slice(1);
if (!/^e2e[a-z0-9_]*$/.test(name)) {
  throw new Error(
    `Refusing to reset "${name}": the end-to-end database's name must start with "e2e".`,
  );
}

const psql = (sql: string, database = "postgres") =>
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
  );
psql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
psql(`CREATE DATABASE ${name}`);

const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? DATABASE_URL };
for (const script of ["migrate.js", "seed.js"]) {
  execFileSync("node", [path.join("dist", script)], { cwd: api, env, stdio: "inherit" });
}

// A few ZIP codes, as the census would load them (it reads the Census Bureau's files online).
const zips = Object.values(ZIP_CODES).map(
  ({ zip, latitude, longitude }) => `('${zip}', ${latitude}, ${longitude}, 'FL')`,
);
psql(`INSERT INTO zip_codes (zip, latitude, longitude, state) VALUES ${zips.join(", ")}`, name);

rmSync(MAIL_DIR, { recursive: true, force: true });
console.log(`End-to-end database "${name}" ready (migrated and seeded); mailbox emptied.`);
