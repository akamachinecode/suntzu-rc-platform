import { defineConfig, devices } from "@playwright/test";

// End-to-end checks in a real browser (Playwright, the Itaca standard), starting with
// accessibility (spec 0010): `pnpm test:a11y`.
//
// Locally they run against the site you already have running (dekit's suntzu-rc/app and
// suntzu-rc/api, or `pnpm dev`). In CI, the workflow builds both apps and Playwright starts them.
const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:3000";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";
const ci = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["list"]] : "list",
  use: { baseURL: APP_URL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // Safari's and Firefox's engines: `pnpm test:a11y --project=webkit` (needs `playwright install`).
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: ci
    ? [
        {
          command: "pnpm --filter @workspace/api start",
          url: `${API_URL}/health`,
          timeout: 120_000,
          cwd: "../..",
        },
        {
          command: "pnpm --filter @workspace/app start",
          url: APP_URL,
          timeout: 120_000,
          cwd: "../..",
        },
      ]
    : undefined,
});
