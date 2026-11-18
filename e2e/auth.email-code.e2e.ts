import { expect, test } from "@playwright/test";
import { codeIn, inbox, waitForMail } from "./mail.ts";
import { newEmail } from "./people.ts";

// docs/bits/auth.email-code.md: the code from the sign-in email signs in on the screen where it was
// asked for, works once, and only ever lands on this site.
test.describe("auth.email-code", () => {
  async function askForEmail(
    page: import("@playwright/test").Page,
    email: string,
    path = "/sign-in",
  ) {
    const since = new Date();
    await page.goto(path);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    return waitForMail(email, "sign-in", since);
  }

  test("a new visitor types the code and lands on My SunTzu RC, signed in", async ({ page }) => {
    const email = newEmail("code");
    const mail = await askForEmail(page, email, "/sign-in?next=/me");
    // One email, with the code in the body and never in the subject.
    expect(inbox(email)).toHaveLength(1);
    expect(mail.subject).not.toMatch(/\d{6}/);
    const code = codeIn(mail);

    // People copy "482 913" from the email: the spaces don't matter.
    await page.getByLabel("Code from the email").fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await page.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole("heading", { level: 1, name: "My SunTzu RC" })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });

  test("a wrong code says so and the right one still works", async ({ page }) => {
    const email = newEmail("code");
    const code = codeIn(await askForEmail(page, email));
    const wrong = code === "000000" ? "111111" : "000000";

    await page.getByLabel("Code from the email").fill(wrong);
    await page.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(
      page.getByText("That code isn't right. Check the email and try again."),
    ).toBeVisible();

    await page.getByLabel("Code from the email").fill(code);
    await page.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My SunTzu RC" })).toBeVisible();
  });

  test("a used code doesn't work again", async ({ page, browser }) => {
    const email = newEmail("code");
    const code = codeIn(await askForEmail(page, email));
    await page.getByLabel("Code from the email").fill(code);
    await page.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My SunTzu RC" })).toBeVisible();

    // Someone else types the same code on another device: refused.
    const other = await (await browser.newContext()).newPage();
    await other.goto("/sign-in");
    await other.getByLabel("Email").fill(email);
    // Asking again sends a new email whose code replaces the first one; the old code no longer works.
    await other.getByRole("button", { name: "Email me a sign-in link" }).click();
    await other.getByLabel("Code from the email").fill(code);
    await other.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(other.getByText(/That code isn't right|That code has expired/)).toBeVisible();
    await other.context().close();
  });

  test("a crafted ?next= never lands on another site", async ({ page }) => {
    const email = newEmail("code");
    // Browsers read /\evil.example as //evil.example (spec 0010): the code must land on /me instead.
    const code = codeIn(await askForEmail(page, email, "/sign-in?next=/%5Cevil.example"));
    await page.getByLabel("Code from the email").fill(code);
    await page.getByRole("button", { name: "Sign in with the code" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/me$/);
  });
});
