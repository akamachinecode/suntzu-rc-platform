import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { API, APP, CREW_EMAILS_ENV, CREW_INBOX, DATABASE_URL, MAIL_DIR } from "./env.ts";

// End-to-end tests: one file per bit, e2e/<area>.<action>.e2e.ts. Run them with `pnpm test:e2e`
// (it starts the local database and builds everything first), or one bit with
// `pnpm test:e2e --grep events.list`. The site-wide checks in apps/app/e2e (accessibility, motion,
// speed) are separate: `pnpm test:a11y`.
//
// The apps run as production builds against a database of their own (`e2e`, next to the local
// `app`), emptied, migrated and seeded at every start (database.ts), with test-only settings:
// emails land in e2e/.mail as files (mail.ts) and crew@example.test is the crew. Tests sign up their
// own people (people.ts), so they never share data. No retries on purpose: a flaky test hides a
// real problem. Fix its cause instead.
//
// Locally, stop the dev servers first (`dekit stop suntzu-rc/app suntzu-rc/api`): they use the same
// ports, and with them running Playwright would test them instead, without the test settings.
const root = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  outputDir: "test-results",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  globalSetup: "./global-setup.ts",
  use: { baseURL: APP, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/database.ts && pnpm --filter @workspace/api start",
      cwd: root,
      url: `${API}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: "test",
        DATABASE_URL,
        BETTER_AUTH_SECRET: "end-to-end-tests-only-secret-0123456789",
        API_URL: API,
        APP_URL: APP,
        MAIL_TRANSPORT: "file",
        MAIL_DIR,
        CREW_EMAILS: CREW_EMAILS_ENV,
        CREW_INBOX,
        ENGINE_SNAPSHOT_DIR: path.join(root, "e2e", ".snapshots"),
        OTEL_SDK_DISABLED: "true",
      },
    },
    {
      command: "pnpm --filter @workspace/app start --port 3000",
      cwd: root,
      url: `${APP}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { API_URL: API, OTEL_SDK_DISABLED: "true" },
    },
  ],
});
