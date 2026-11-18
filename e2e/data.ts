import { execFileSync } from "node:child_process";
import path from "node:path";
import { type APIRequestContext, expect, type PlaywrightWorkerArgs } from "@playwright/test";
import {
  API,
  APP,
  CREW_EMAILS_ENV,
  CREW_INBOX,
  CREW_STATE,
  DATABASE_URL,
  MAIL_DIR,
} from "./env.ts";
import { FROM_APP } from "./people.ts";

// Data for the end-to-end tests, made the way people make it: the crew adds events by hand, members
// claim clubs and the crew approves them. The seeded clubs, fields and tracks (apps/api/src/events/
// seed-data.ts) are there from the start.

/** The `playwright` fixture's type (@playwright/test doesn't export one by name). */
export type Playwright = PlaywrightWorkerArgs["playwright"];

/**
 * A date `days` from today in Florida, as the API takes it (YYYY-MM-DD). The jobs and the event
 * pages count days in Florida time, so a UTC date would be a day off in the evening.
 */
export function inDays(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
    new Date(),
  );
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * ZIP codes for "near me", loaded by database.ts at every start. The census loads them from the
 * Census Bureau's Gazetteer (census.import), which tests never download; these rows are copied from
 * the census's own saved sample, apps/api/src/places/census/fixtures/zcta-sample.zip.
 */
export const ZIP_CODES = {
  /** Coconut Grove, Miami: Silver Field is 20 miles away, Markham Park 28, West Delray 51. */
  miami: { zip: "33133", latitude: 25.730449, longitude: -80.233615 },
  /** Naples: more than 85 miles from every seeded field and track. */
  naples: { zip: "34102", latitude: 26.137498, longitude: -81.799105 },
  /** Fleming Island, near Jacksonville: hundreds of miles from every seeded field and track. */
  flemingIsland: { zip: "32003", latitude: 30.09517, longitude: -81.709584 },
} as const;

/** A unique, recognisable name for something a test creates. */
export function unique(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** An API request context signed in as the crew. Dispose it when done. */
export async function crewApi(playwright: Playwright): Promise<APIRequestContext> {
  return playwright.request.newContext({ storageState: CREW_STATE });
}

export type NewEvent = {
  name?: string;
  kind?: string;
  discipline?: string;
  startDate?: string;
  endDate?: string;
  place?: string;
  placeText?: string;
  host?: string;
  url?: string;
  summary?: string;
  beginnerFriendly?: boolean;
};

/** The crew adds an event by hand (POST /crew/events); it's published at once. Returns its slug. */
export async function addEvent(
  playwright: Playwright,
  event: NewEvent = {},
): Promise<{ slug: string; name: string }> {
  const crew = await crewApi(playwright);
  const name = event.name ?? unique("E2E Fun Fly");
  const response = await crew.post(`${API}/crew/events`, {
    data: {
      kind: "fly-in",
      discipline: "air",
      startDate: inDays(10),
      placeText: "Orlando, FL",
      url: "https://example.com/e2e-event",
      ...event,
      name,
    },
    headers: FROM_APP,
  });
  expect(
    response.ok(),
    `POST /crew/events answered ${response.status()}: ${await response.text()}`,
  ).toBe(true);
  const { slug } = (await response.json()) as { slug: string };
  await crew.dispose();
  return { slug, name };
}

/**
 * Makes the member signed in on `member` a verified organiser of `host` (a seeded club's slug): they
 * claim it asking the crew to check, and the crew approves (docs/bits/hosts.claim.md, hosts.verify.md).
 */
export async function becomeOrganiser(
  playwright: Playwright,
  member: APIRequestContext,
  email: string,
  host: string,
) {
  const claimed = await member.post(`${API}/organise/claims`, {
    data: { host, method: "crew", note: "End-to-end test organiser." },
    headers: FROM_APP,
  });
  expect(claimed.ok(), `the claim answered ${claimed.status()}: ${await claimed.text()}`).toBe(
    true,
  );
  const crew = await crewApi(playwright);
  const pending = (await (await crew.get(`${API}/crew/claims`)).json()) as {
    userId: string;
    email: string;
    host: { slug: string };
  }[];
  const claim = pending.find((item) => item.email === email && item.host.slug === host);
  expect(claim, `no pending claim of ${host} by ${email}`).toBeTruthy();
  const approved = await crew.post(`${API}/crew/claims/${host}/${claim!.userId}/approve`, {
    headers: FROM_APP,
  });
  expect(approved.ok(), `the approval answered ${approved.status()}`).toBe(true);
  await crew.dispose();
}

/**
 * Runs one of the API's jobs (`notify`, `engine`, `census`, `seed`) against the tests' database, with
 * the same settings as the API under test, and returns what it printed.
 */
export function runJob(job: "notify" | "engine" | "census" | "seed", args: string[] = []): string {
  const api = path.resolve(import.meta.dirname, "..", "apps", "api");
  return execFileSync("node", [path.join("dist", `${job}.js`), ...args], {
    cwd: api,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? DATABASE_URL,
      BETTER_AUTH_SECRET: "end-to-end-tests-only-secret-0123456789",
      API_URL: API,
      APP_URL: APP,
      MAIL_TRANSPORT: "file",
      MAIL_DIR,
      CREW_EMAILS: CREW_EMAILS_ENV,
      CREW_INBOX,
      ENGINE_SNAPSHOT_DIR: path.resolve(import.meta.dirname, ".snapshots"),
      OTEL_SDK_DISABLED: "true",
    },
  });
}
