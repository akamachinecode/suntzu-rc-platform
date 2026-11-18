import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";
import { MAIL_DIR } from "./env.ts";

// The test mailbox: with MAIL_TRANSPORT=file the API writes every email it sends as one JSON file in
// e2e/.mail (apps/api/src/mail/mail.ts). Tests read what a person would find in their inbox.

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
  sentAt: string;
};

/** Every email sent to `to` so far, oldest first. */
export function inbox(to: string): Mail[] {
  if (!existsSync(MAIL_DIR)) return [];
  return readdirSync(MAIL_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(path.join(MAIL_DIR, file), "utf8")) as Mail)
    .filter((mail) => mail.to.toLowerCase() === to.toLowerCase());
}

/**
 * Waits for an email to `to` whose subject matches, sent after `since` (default: any), and returns
 * the newest one. Fails with a hint when the API isn't writing to the test mailbox.
 */
export async function waitForMail(
  to: string,
  subject: RegExp | string = /.*/,
  since = new Date(0),
): Promise<Mail> {
  const match = (mail: Mail) =>
    new Date(mail.sentAt) >= since &&
    (typeof subject === "string" ? mail.subject.includes(subject) : subject.test(mail.subject));
  let found: Mail | undefined;
  await expect
    .poll(
      () => {
        found = inbox(to).filter(match).at(-1);
        return !!found;
      },
      {
        message: `No email to ${to} matching ${subject} in ${MAIL_DIR}. Is the API running with MAIL_TRANSPORT=file (pnpm test:e2e starts it; stop the dev servers first)?`,
        timeout: 15_000,
      },
    )
    .toBe(true);
  return found!;
}

/** The 6-digit code in an email (sign-in, a club's address check). */
export function codeIn(mail: Mail): string {
  const code = mail.text.match(/\b(\d{6})\b/)?.[1];
  expect(code, `no 6-digit code in "${mail.subject}"`).toBeTruthy();
  return code!;
}

/** The first link in an email's text that starts with `prefix`. */
export function linkIn(mail: Mail, prefix: string): string {
  const link = mail.text.match(
    new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\S*`),
  )?.[0];
  expect(link, `no link to ${prefix} in "${mail.subject}"`).toBeTruthy();
  return link!;
}
