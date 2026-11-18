import { execFileSync } from "node:child_process";
import path from "node:path";
import { type APIRequestContext, expect, type PlaywrightWorkerArgs } from "@playwright/test";
import { crewApi } from "./data.ts";
import { API, DATABASE_URL } from "./env.ts";
import { FROM_APP, newEmail, signIn } from "./people.ts";

// Helpers for the tests of the scheduled jobs (notify, seed): members and crew edits through the
// API, days as the jobs count them (Florida time), how emails write dates, and the few database
// steps that have no other way in from a test.

const root = path.resolve(import.meta.dirname, "..");

/** The `playwright` fixture (data.ts names it `Playwright`, which @playwright/test doesn't export). */
export type Playwright = PlaywrightWorkerArgs["playwright"];

/** addEvent's default kind ("fun-fly") isn't one the API takes; an open day doesn't start a series. */
export const OPEN_DAY = "open-day";

/**
 * A new member on an API context of their own, signed in and, like everyone who lands on My SunTzu
 * RC after signing in, with their settings created (GET /me). Dispose `request` when done.
 */
export async function member(playwright: Playwright, label: string) {
  const request = await playwright.request.newContext();
  const email = await signIn(request, newEmail(label));
  const me = await request.get(`${API}/me`);
  expect(me.ok(), `GET /me answered ${me.status()}`).toBe(true);
  return { request, email };
}

/** A PUT to the API as `request`'s member (follow, going). */
export async function put(request: APIRequestContext, path: string): Promise<void> {
  const response = await request.put(`${API}${path}`, { headers: FROM_APP });
  expect(response.ok(), `PUT ${path} answered ${response.status()}`).toBe(true);
}

/** A member changes their settings (PATCH /me). */
export async function settings(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<void> {
  const response = await request.patch(`${API}/me`, { data, headers: FROM_APP });
  expect(response.ok(), `PATCH /me answered ${response.status()}: ${await response.text()}`).toBe(
    true,
  );
}

/** The crew edits an event (PATCH /crew/events/:slug): every changed field becomes a `changes` row. */
export async function crewEdits(
  playwright: Playwright,
  slug: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const crew = await crewApi(playwright);
  const response = await crew.patch(`${API}/crew/events/${slug}`, {
    data: patch,
    headers: FROM_APP,
  });
  expect(response.status(), `PATCH /crew/events/${slug}: ${await response.text()}`).toBe(204);
  await crew.dispose();
}

/** A day `days` from today in Florida (America/New_York), as YYYY-MM-DD: the jobs' own calendar. */
export function floridaDate(days = 0): string {
  // en-CA writes dates as YYYY-MM-DD.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
    new Date(),
  );
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The weekend the digest is about: Friday to Sunday ahead in Florida (`weekend` in notify.ts). */
export function weekendAhead(): { friday: string; saturday: string; sunday: string } {
  const weekday = new Date(`${floridaDate()}T12:00:00Z`).getUTCDay();
  const toFriday = (5 - weekday + 7) % 7;
  return {
    friday: floridaDate(toFriday),
    saturday: floridaDate(toFriday + 1),
    sunday: floridaDate(toFriday + 2),
  };
}

/** "Dec 8, 2026" or "Dec 8–9, 2026": how emails write an event's dates (apps/api/src/mail/dates.ts). */
export function emailDates(start: string, end?: string | null): string {
  const day = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(
      new Date(`${date}T12:00:00Z`),
    );
  if (!end || end === start) return day(start, { month: "short", day: "numeric", year: "numeric" });
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return `${day(start, { month: "short", day: "numeric", year: "numeric" })} – ${day(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (start.slice(5, 7) !== end.slice(5, 7)) {
    return `${day(start, { month: "short", day: "numeric" })} – ${day(end, { month: "short", day: "numeric" })}, ${end.slice(0, 4)}`;
  }
  return `${day(start, { month: "short", day: "numeric" })}–${day(end, { day: "numeric" })}, ${end.slice(0, 4)}`;
}

/** The tests' database name (`e2e`), from env.ts. */
export const E2E_DATABASE = new URL(process.env.E2E_DATABASE_URL ?? DATABASE_URL).pathname.slice(1);

/** The tests' database URL with another database name (for a database of a test's own). */
export function databaseUrl(name: string): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? DATABASE_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

/** Runs SQL in the local PostgreSQL (`pnpm db:up`), the way database.ts does; returns psql's bare output. */
export function psql(database: string, sql: string): string {
  return execFileSync(
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
      "-tAc",
      sql,
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

/**
 * Runs one of the API's built scripts (`migrate`, `seed`) against `databaseUrl`, with the test
 * settings runJob uses, and returns what it printed. Throws, with its error output, when it fails.
 */
export function runScript(script: "migrate" | "seed", database: string): string {
  return execFileSync("node", [path.join("dist", `${script}.js`)], {
    cwd: path.join(root, "apps", "api"),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl(database),
      BETTER_AUTH_SECRET: "end-to-end-tests-only-secret-0123456789",
      OTEL_SDK_DISABLED: "true",
    },
  });
}
