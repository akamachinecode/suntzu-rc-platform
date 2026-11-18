import path from "node:path";

// Where the end-to-end tests find the apps, their database and their mailbox. The same values reach
// the API through playwright.config.ts, so tests and servers always agree.
export const API = process.env.E2E_API_URL ?? "http://localhost:3001";
export const APP = process.env.E2E_APP_URL ?? "http://localhost:3000";

/** The tests' own database, next to the local `app` one (same port as `pnpm db:up`, see compose.yaml). */
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  `postgres://postgres:postgres@localhost:${process.env.DB_PORT ?? 5432}/e2e`;

/** Every email the API sends during the tests, one JSON file each (MAIL_TRANSPORT=file). */
export const MAIL_DIR = path.resolve(import.meta.dirname, ".mail");

/** The crew's address (CREW_EMAILS); global-setup.ts signs it in once for every test. */
export const CREW_EMAIL = "crew@example.test";
/** CREW_EMAILS for the API under test. */
export const CREW_EMAILS_ENV = CREW_EMAIL;
/** Where the crew hears about messages nobody else can take (CREW_INBOX). */
export const CREW_INBOX = "crew-inbox@example.test";
/** The crew's session, saved by global-setup.ts: `test.use({ storageState: CREW_STATE })`. */
export const CREW_STATE = path.resolve(import.meta.dirname, ".auth", "crew.json");
