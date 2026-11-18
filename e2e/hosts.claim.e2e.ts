import { expect, test } from "@playwright/test";
import { crewApi } from "./data.ts";
import { API, CREW_INBOX } from "./env.ts";
import { codeIn, inbox, waitForMail } from "./mail.ts";
import { addressAt, expectStatus, newMember, waitForMailWith } from "./organisers.ts";
import { crewPage, FROM_APP, newEmail, signedIn } from "./people.ts";

// docs/bits/hosts.claim.md: a member claims a club on /organise, proving it by an email at the club's
// own domain, a code on its website, or the crew's check. Club: imperial-rc-club (imperialrcclub.com).
const CLUB = "imperial-rc-club";
const NAME = "Imperial R/C Club";
const DOMAIN = "imperialrcclub.com";

test.describe("hosts.claim", () => {
  test("a member claims with an address at the club's domain, and the code lands there", async ({
    page,
  }) => {
    await signedIn(page, "officer");
    await page.goto(`/organise?club=${CLUB}`);
    await expect(page.getByLabel("Your club or track")).toHaveValue(CLUB);
    await expect(
      page.getByRole("radio", { name: /An email at the club's own domain/ }),
    ).toBeChecked();

    const address = addressAt(DOMAIN);
    const since = new Date();
    await page.getByLabel("Address at the club's domain").fill(address);
    await page.getByRole("button", { name: "Claim it" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "We emailed you a 6-digit code. Enter it below." }),
    ).toBeVisible();

    const mail = await waitForMail(address, `Your code to manage ${NAME} on SunTzu RC`, since);
    codeIn(mail);
    expect(mail.text).toContain(
      `Sent to an address at ${DOMAIN} because it's the club's own domain.`,
    );
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    await expect(claim.getByText("Waiting to be verified")).toBeVisible();
    await expect(claim.getByLabel(`Code from the email to your ${DOMAIN} address`)).toBeVisible();

    // One code every few minutes: the club's inbox isn't flooded.
    const again = await page.request.post(`${API}/organise/claims`, {
      data: { host: CLUB, method: "domain-email", email: address },
      headers: FROM_APP,
    });
    await expectStatus(again, 400);
    expect(await again.text()).toContain(
      "We just sent a code. Wait 5 minutes before asking for another.",
    );
    expect(inbox(address)).toHaveLength(1);
  });

  test("an address at another domain is refused, and the form keeps it", async ({ page }) => {
    await signedIn(page, "officer");
    await page.goto(`/organise?club=${CLUB}`);
    const elsewhere = newEmail("officer");
    await page.getByLabel("Address at the club's domain").fill(elsewhere);
    await page.getByRole("button", { name: "Claim it" }).click();

    // The API's reason, word for word (soft, so the rest still runs when only the wording is wrong).
    await expect
      .soft(page.getByRole("status").filter({ hasText: `Use an address at ${DOMAIN}.` }))
      .toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /\S/ })).toHaveCount(1);
    await expect(page.getByLabel("Address at the club's domain")).toHaveValue(elsewhere);
    await expect(page.getByLabel("Your club or track")).toHaveValue(CLUB);
    expect(inbox(elsewhere).filter((mail) => mail.subject.includes(NAME))).toHaveLength(0);
    const mine = await page.request.get(`${API}/organise`);
    expect(await mine.json()).toEqual([]);
  });

  test("asking the crew: the crew hears about it and the claim waits for a person", async ({
    page,
    browser,
    playwright,
  }) => {
    const email = await signedIn(page, "officer");
    const note = `I'm the treasurer, see the club's Facebook page (${email}).`;
    await page.goto(`/organise?club=${CLUB}`);
    await page.getByRole("radio", { name: /Ask the crew to check/ }).check();
    const since = new Date();
    await page.getByLabel("Your role and how we can check").fill(note);
    await page.getByRole("button", { name: "Claim it" }).click();

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Thanks. The crew will check and get back to you." }),
    ).toBeVisible();
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    await expect(claim.getByText("Waiting to be verified")).toBeVisible();
    await expect(claim.getByText("The crew is checking.")).toBeVisible();
    const mail = await waitForMailWith(CREW_INBOX, note, since);
    expect(mail.subject).toBe(`Club claim to check: ${NAME}`);

    const crew = await crewPage(browser);
    await crew.goto("/crew/claims");
    const waiting = crew.getByRole("listitem").filter({ hasText: email });
    await expect(waiting).toContainText(`says they run ${NAME}`);
    await crew.context().close();

    // Tidy up: the crew turns it down, so claims don't pile up run after run (hosts.verify tests
    // the decision itself).
    const api = await crewApi(playwright);
    const pending = (await (await api.get(`${API}/crew/claims`)).json()) as {
      userId: string;
      email: string;
    }[];
    const mine = pending.find((item) => item.email === email);
    await expectStatus(
      await api.post(`${API}/crew/claims/${CLUB}/${mine!.userId}/reject`, { headers: FROM_APP }),
      204,
    );
    await api.dispose();
  });

  test("the website method shows the code to publish on the club's site", async ({ page }) => {
    await signedIn(page, "officer");
    await page.goto(`/organise?club=${CLUB}`);
    await page.getByRole("radio", { name: /A code on the club's website/ }).check();
    await page.getByRole("button", { name: "Claim it" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Now put the code on your website" }),
    ).toBeVisible();
    const claim = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: NAME }) });
    const [status] = (await (await page.request.get(`${API}/organise`)).json()) as {
      websiteCode: string;
    }[];
    expect(status!.websiteCode).toMatch(/^servo-verify-[0-9a-f]{10}$/);
    await expect(claim.getByText(status!.websiteCode, { exact: true })).toBeVisible();
    await expect(claim.getByRole("button", { name: `Check my website for ${NAME}` })).toBeVisible();
  });

  test("signed out, the page asks to sign in first, and the API answers 401", async ({
    page,
    playwright,
  }) => {
    await page.goto(`/organise?club=${CLUB}`);
    await expect(page.getByRole("link", { name: "Sign in to claim" })).toHaveAttribute(
      "href",
      `/sign-in?next=${encodeURIComponent(`/organise?club=${CLUB}`)}`,
    );
    await expect(page.getByRole("button", { name: "Claim it" })).toHaveCount(0);

    const visitor = await playwright.request.newContext();
    await expectStatus(
      await visitor.post(`${API}/organise/claims`, {
        data: { host: CLUB, method: "crew", note: "Let me in." },
        headers: FROM_APP,
      }),
      401,
    );
    await expectStatus(await visitor.get(`${API}/organise`), 401);
    await visitor.dispose();

    const { request: member } = await newMember(playwright);
    await expectStatus(
      await member.post(`${API}/organise/claims`, {
        data: { host: "no-such-club", method: "crew" },
        headers: FROM_APP,
      }),
      404,
    );
    await member.dispose();
  });
});
