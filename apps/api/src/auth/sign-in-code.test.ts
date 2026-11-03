// The sign-in code next to the link (docs/specs/0006-sign-in-code.md), against a real PostgreSQL and
// the real Better Auth setup. Needs the local database (`pnpm db:up`); skipped without one, as in
// CI. It creates its own database, `suntzurc_auth_code`, and drops it at the end.
import { existsSync } from "node:fs";
import { createDb, eq, runMigrations, schema, sql } from "@workspace/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "./auth.js";
import type { Mail } from "../mail/mail.js";

// Emails are caught here instead of being printed or sent.
const sent = vi.hoisted(() => [] as Mail[]);
vi.mock("../mail/mail.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../mail/mail.js")>();
  return {
    ...real,
    sendMail: async (mail: Mail) => {
      sent.push(mail);
    },
  };
});

const CREW = "crew@example.com";
const APP = "http://localhost:3000";
const CLOSED = [
  "/email-otp/send-verification-otp",
  "/email-otp/check-verification-otp",
  "/email-otp/verify-email",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
  "/email-otp/reset-password",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
];

function databaseUrl(): string | undefined {
  const file = new URL("../../.env", import.meta.url);
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);
  return process.env.DATABASE_URL;
}

async function reachable(url: string): Promise<boolean> {
  const { db, pool } = createDb(url);
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000),
    );
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    void pool.end();
  }
}

const url = databaseUrl();
const available = url !== undefined && (await reachable(url));

describe.runIf(available)("sign-in code", () => {
  const name = "suntzurc_auth_code";
  const testUrl = url!.replace(/\/[^/?]+(\?|$)/, `/${name}$1`);
  const admin = createDb(url!);
  let test: ReturnType<typeof createDb>;
  let auth: Auth;

  beforeAll(async () => {
    await admin.db.execute(sql.raw(`drop database if exists ${name} with (force)`));
    await admin.db.execute(sql.raw(`create database ${name}`));
    await runMigrations(testUrl);
    test = createDb(testUrl);
    // env.ts reads these when auth.ts is first imported.
    process.env.CREW_EMAILS = CREW;
    process.env.APP_URL = APP;
    process.env.MAIL_TRANSPORT = "log";
    const { createAuth } = await import("./auth.js");
    auth = createAuth(test.db);
  }, 60_000);

  afterAll(async () => {
    await test?.pool.end();
    await admin.db.execute(sql.raw(`drop database if exists ${name} with (force)`));
    await admin.pool.end();
  });

  beforeEach(() => {
    sent.length = 0;
    vi.useRealTimers();
  });

  async function askForEmail(email: string): Promise<{ mail: Mail; code: string }> {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: `${APP}/me` },
      headers: new Headers(),
    });
    const mail = sent.at(-1)!;
    const code = /Your code: (\d{6})/.exec(mail.text)?.[1];
    expect(code).toBeDefined();
    return { mail, code: code! };
  }

  const signIn = (email: string, otp: string) =>
    auth.api.signInEmailOTP({ body: { email, otp }, headers: new Headers() });

  async function roleOf(email: string) {
    const [user] = await test.db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.email, email));
    return user?.role;
  }

  it("sends one email with the link and the code, never in the subject or the preview", async () => {
    const { mail, code } = await askForEmail("pilot@example.com");
    expect(sent).toHaveLength(1);
    expect(mail.subject).not.toMatch(/\d/);
    expect(mail.text).toMatch(/Sign in: https?:\/\/[^/\s]+\/auth\/magic-link\/verify\?token=/);
    expect(mail.html).toContain(code);
    const preview = /<div style="display:none[^>]*>([^<]*)/.exec(mail.html)?.[1] ?? "";
    expect(preview).toContain("Your sign-in link and code");
    expect(preview).not.toContain(code);
    // The text version shows the code only after the explanation (what plain-text previews cut).
    expect(mail.text.indexOf(code)).toBeGreaterThan(200);
    // The database keeps a hash of the code, never the code.
    const [stored] = await test.db
      .select({ value: schema.verification.value })
      .from(schema.verification)
      .where(eq(schema.verification.identifier, "sign-in-otp-pilot@example.com"));
    expect(stored?.value).toBeDefined();
    expect(stored!.value).not.toContain(code);
  });

  it("signs in with the code and creates the account the first time", async () => {
    const { code } = await askForEmail("New.Pilot@Example.com");
    const result = await signIn("New.Pilot@Example.com", code);
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe("new.pilot@example.com");
    expect(await roleOf("new.pilot@example.com")).toBe("member");
    // A code works once.
    await expect(signIn("new.pilot@example.com", code)).rejects.toMatchObject({
      body: { code: "INVALID_OTP" },
    });
  });

  it("gives the crew role to a crew address that signs in with the code", async () => {
    const { code } = await askForEmail(CREW);
    await signIn(CREW, code);
    expect(await roleOf(CREW)).toBe("crew");
  });

  it("refuses the code after 3 wrong tries, even when it's right", async () => {
    const { code } = await askForEmail("typo@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(signIn("typo@example.com", wrong)).rejects.toMatchObject({
        body: { code: "INVALID_OTP" },
      });
    }
    await expect(signIn("typo@example.com", code)).rejects.toMatchObject({
      body: { code: "TOO_MANY_ATTEMPTS" },
    });
  });

  it("only takes the code from the latest email", async () => {
    const first = await askForEmail("twice@example.com");
    const second = await askForEmail("twice@example.com");
    if (first.code !== second.code) {
      await expect(signIn("twice@example.com", first.code)).rejects.toMatchObject({
        body: { code: "INVALID_OTP" },
      });
    }
    await expect(signIn("twice@example.com", second.code)).resolves.toMatchObject({
      user: { email: "twice@example.com" },
    });
  });

  it("refuses a code older than 15 minutes", async () => {
    const { code } = await askForEmail("late@example.com");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    await expect(signIn("late@example.com", code)).rejects.toMatchObject({
      body: { code: "OTP_EXPIRED" },
    });
  });

  it("keeps only the sign-in route of the email-code plugin open", async () => {
    const post = (path: string, body: object) =>
      auth.handler(
        new Request(`http://localhost:3001/auth${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: APP },
          body: JSON.stringify(body),
        }),
      );
    for (const path of CLOSED) {
      const response = await post(path, { email: "pilot@example.com", type: "sign-in" });
      expect(response.status, path).toBe(404);
    }
    const open = await post("/sign-in/email-otp", { email: "nobody@example.com", otp: "123456" });
    expect(open.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});
