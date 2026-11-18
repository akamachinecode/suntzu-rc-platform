import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts validates process.env when it's imported, so each case imports a fresh copy.
async function load(values: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  return import("./env.js");
}

const required = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app",
  BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-0123456789",
};

describe("env", () => {
  afterEach(() => vi.unstubAllEnvs());

  // The test mailbox writes sign-in codes to files: it must never run in production (spec 0011).
  it("refuses MAIL_TRANSPORT=file in production", async () => {
    await expect(
      load({ ...required, NODE_ENV: "production", MAIL_TRANSPORT: "file" }),
    ).rejects.toThrow(/MAIL_TRANSPORT=file is for tests only/);
  });

  it("accepts MAIL_TRANSPORT=file in tests, with its folder", async () => {
    const { env } = await load({
      ...required,
      NODE_ENV: "test",
      MAIL_TRANSPORT: "file",
      MAIL_DIR: "/tmp/mail",
    });
    expect(env).toMatchObject({ MAIL_TRANSPORT: "file", MAIL_DIR: "/tmp/mail" });
  });

  it("sends with SES in production", async () => {
    const { env } = await load({ ...required, NODE_ENV: "production", MAIL_TRANSPORT: "ses" });
    expect(env.MAIL_TRANSPORT).toBe("ses");
  });
});
