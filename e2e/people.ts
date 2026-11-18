import { type APIRequestContext, type Browser, expect, type Page } from "@playwright/test";
import { API, APP, CREW_STATE } from "./env.ts";
import { codeIn, waitForMail } from "./mail.ts";

// People for the end-to-end tests. SunTzu RC has no passwords: a person types their email, gets one
// email with a link and a 6-digit code, and uses either (docs/bits/auth.email-link.md). Every test
// gets its own address, so tests never share data or each other's codes.

/** Every POST, PATCH, PUT and DELETE to the API carries the app's origin, as the browser's would. */
export const FROM_APP = { origin: APP };

/** A new, unique address each time (the .test domain never receives real email). */
export function newEmail(label = "member"): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${label}-${id}@example.test`;
}

/**
 * Signs `email` in through the API, as the sign-in page does: asks for the email, reads the code
 * from the test mailbox and types it. The session cookie stays in `request` (a page's
 * `page.request` shares it with the page). A new address gets an account on its first sign-in.
 */
export async function signIn(request: APIRequestContext, email = newEmail()): Promise<string> {
  const since = new Date();
  const asked = await request.post(`${API}/auth/sign-in/magic-link`, {
    data: { email, callbackURL: `${APP}/me` },
    headers: FROM_APP,
  });
  expect(asked.ok(), `sign-in link answered ${asked.status()}`).toBe(true);
  const code = codeIn(await waitForMail(email, "sign-in", since));
  const signed = await request.post(`${API}/auth/sign-in/email-otp`, {
    data: { email, otp: code },
    headers: FROM_APP,
  });
  expect(signed.ok(), `the sign-in code answered ${signed.status()}`).toBe(true);
  return email;
}

/** Signs a new member in the browser of `page` (cookies shared with page.request). */
export async function signedIn(page: Page, label?: string): Promise<string> {
  return signIn(page.request, newEmail(label));
}

/** A browser page signed in as the crew (crew@example.test, signed in once by global-setup.ts). */
export async function crewPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: CREW_STATE, baseURL: APP });
  return context.newPage();
}
