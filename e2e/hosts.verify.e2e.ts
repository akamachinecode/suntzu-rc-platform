import { expect, type Page, test } from "@playwright/test";
import { becomeOrganiser, crewApi } from "./data.ts";
import { API } from "./env.ts";
import { codeIn, waitForMail } from "./mail.ts";
import { addressAt, expectStatus, newMember, type Playwright } from "./organisers.ts";
import { crewPage, FROM_APP, signedIn } from "./people.ts";

// docs/bits/hosts.verify.md: a claim is proved by the code emailed to the club's own domain, or by the
// crew's check at /crew/claims; then the member organises the club. Club: eglin-aero-modelers.
// "Check my website" fetches the club's real site on the internet, so it isn't run here.
const CLUB = "eglin-aero-modelers";
const NAME = "Eglin Aero Modelers";
const DOMAIN = "eglinaeromodellers.org";

/** The member on `page` claims the club with a new address at its domain; returns the code emailed. */
async function claimByEmail(page: Page): Promise<string> {
  const address = addressAt(DOMAIN);
  const since = new Date();
  await page.goto(`/organise?club=${CLUB}`);
  await page.getByLabel("Address at the club's domain").fill(address);
  await page.getByRole("button", { name: "Claim it" }).click();
  return codeIn(await waitForMail(address, `Your code to manage ${NAME}`, since));
}

/** The pending crew claim of `email`, as the crew sees it. */
async function pendingClaim(playwright: Playwright, email: string) {
  const crew = await crewApi(playwright);
  const pending = (await (await crew.get(`${API}/crew/claims`)).json()) as {
    userId: string;
    email: string;
  }[];
  await crew.dispose();
  return pending.find((claim) => claim.email === email);
}

test.describe("hosts.verify", () => {
  test("the code from the club's address verifies the claim and opens the dashboard", async ({
    page,
  }) => {
    await signedIn(page, "officer");
    const code = await claimByEmail(page);
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    // Typed as people copy it from the email, with a space.
    await claim
      .getByLabel(`Code from the email to your ${DOMAIN} address`)
      .fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await claim.getByRole("button", { name: `Verify ${NAME}` }).click();

    await expect(claim.getByText("Verified", { exact: true })).toBeVisible();
    await claim.getByRole("link", { name: "Open the club dashboard" }).click();
    await expect(page).toHaveURL(new RegExp(`/organise/${CLUB}$`));
    await expect(page.getByRole("heading", { level: 1, name: NAME })).toBeVisible();
    await page.goto(`/clubs/${CLUB}`);
    await expect(page.getByText("Verified: its organisers publish here")).toBeVisible();
  });

  test("a wrong code is refused, and the right one still works", async ({ page }) => {
    await signedIn(page, "officer");
    const code = await claimByEmail(page);
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    const field = claim.getByLabel(`Code from the email to your ${DOMAIN} address`);
    await field.fill(code === "000000" ? "111111" : "000000");
    await claim.getByRole("button", { name: `Verify ${NAME}` }).click();
    // The API's reason, word for word (soft, so the rest still runs when only the wording is wrong).
    await expect.soft(claim.getByRole("status")).toHaveText("That code isn't right.");
    await expect(claim.getByRole("status")).not.toBeEmpty();
    await expect(claim.getByText("Waiting to be verified")).toBeVisible();

    await field.fill(code);
    await claim.getByRole("button", { name: `Verify ${NAME}` }).click();
    await expect(claim.getByText("Verified", { exact: true })).toBeVisible();
  });

  test("eight wrong codes lock the claim: then only the crew can verify it", async ({
    playwright,
  }) => {
    const { request } = await newMember(playwright, "guesser");
    const address = addressAt(DOMAIN, "guess");
    const since = new Date();
    await expectStatus(
      await request.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "domain-email", email: address },
        headers: FROM_APP,
      }),
      201,
    );
    const code = codeIn(await waitForMail(address, NAME, since));
    const wrong = code === "000000" ? "111111" : "000000";
    const guess = (value: string) =>
      request.post(`${API}/organise/claims/${CLUB}/code`, {
        data: { code: value },
        headers: FROM_APP,
      });
    for (let attempt = 1; attempt <= 8; attempt++) {
      const answer = await guess(wrong);
      await expectStatus(answer, 400);
      expect(await answer.text()).toContain("That code isn't right.");
    }
    const locked = await guess(code);
    await expectStatus(locked, 400);
    expect(await locked.text()).toContain(
      "Too many wrong codes for this club. Ask the crew to check instead.",
    );
    const [status] = (await (await request.get(`${API}/organise`)).json()) as {
      verified: boolean;
    }[];
    expect(status!.verified).toBe(false);
    await request.dispose();
  });

  test("the crew approves a claim at /crew/claims, and a second officer runs the club too", async ({
    page,
    browser,
    playwright,
  }) => {
    const first = await newMember(playwright, "officer");
    await becomeOrganiser(playwright, first.request, first.email, CLUB);

    const second = await signedIn(page, "officer");
    await expectStatus(
      await page.request.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "crew", note: "Second officer, the club's secretary." },
        headers: FROM_APP,
      }),
      201,
    );
    const crew = await crewPage(browser);
    await crew.goto("/crew/claims");
    const waiting = crew.getByRole("listitem").filter({ hasText: second });
    await waiting.getByRole("button", { name: `Approve ${NAME}` }).click();
    await expect(waiting).toHaveCount(0);
    await crew.context().close();

    await page.goto("/organise");
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    await expect(claim.getByText("Verified", { exact: true })).toBeVisible();
    await expect(claim.getByRole("link", { name: "Open the club dashboard" })).toBeVisible();
    // Both officers open the club's dashboard.
    await expectStatus(await page.request.get(`${API}/organise/${CLUB}`), 200);
    await expectStatus(await first.request.get(`${API}/organise/${CLUB}`), 200);
    await first.request.dispose();
  });

  test("the crew rejects a claim and it's gone", async ({ page, browser }) => {
    const email = await signedIn(page, "pretender");
    await expectStatus(
      await page.request.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "crew", note: "Trust me." },
        headers: FROM_APP,
      }),
      201,
    );
    const crew = await crewPage(browser);
    await crew.goto("/crew/claims");
    const waiting = crew.getByRole("listitem").filter({ hasText: email });
    await waiting.getByRole("button", { name: `Reject ${NAME}` }).click();
    await expect(waiting).toHaveCount(0);
    await crew.context().close();

    await page.goto("/organise");
    await expect(page.getByRole("heading", { name: NAME })).toHaveCount(0);
    expect(await (await page.request.get(`${API}/organise`)).json()).toEqual([]);
    await expectStatus(await page.request.get(`${API}/organise/${CLUB}`), 403);
  });

  test("only the crew approves, and nobody verifies a code they weren't sent", async ({
    playwright,
  }) => {
    const claimant = await newMember(playwright, "claimant");
    await expectStatus(
      await claimant.request.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "crew", note: "Please check." },
        headers: FROM_APP,
      }),
      201,
    );
    const claim = await pendingClaim(playwright, claimant.email);
    expect(claim, "the claim waits for the crew").toBeTruthy();
    const approve = `${API}/crew/claims/${CLUB}/${claim!.userId}/approve`;

    // Another member can't approve it (or even list claims), nor can a visitor.
    const other = await newMember(playwright, "other");
    await expectStatus(await other.request.post(approve, { headers: FROM_APP }), 403);
    await expectStatus(await other.request.get(`${API}/crew/claims`), 403);
    const visitor = await playwright.request.newContext();
    await expectStatus(await visitor.post(approve, { headers: FROM_APP }), 401);
    await expectStatus(
      await visitor.post(`${API}/organise/claims/${CLUB}/code`, {
        data: { code: "123456" },
        headers: FROM_APP,
      }),
      401,
    );
    await visitor.dispose();
    // A member who never asked for a code has none to verify.
    await expectStatus(
      await other.request.post(`${API}/organise/claims/${CLUB}/code`, {
        data: { code: "123456" },
        headers: FROM_APP,
      }),
      404,
    );
    await other.request.dispose();
    const [status] = (await (await claimant.request.get(`${API}/organise`)).json()) as {
      verified: boolean;
    }[];
    expect(status!.verified).toBe(false);

    // Tidy up: the crew turns it down.
    const crew = await crewApi(playwright);
    await expectStatus(
      await crew.post(`${API}/crew/claims/${CLUB}/${claim!.userId}/reject`, { headers: FROM_APP }),
      204,
    );
    await crew.dispose();
    await claimant.request.dispose();
  });
});
