import { expect, test } from "@playwright/test";
import { linkIn, waitForMail } from "./mail.ts";
import { newEmail } from "./people.ts";
import { API } from "./env.ts";

// docs/bits/auth.email-link.md: the sign-in email's link signs in (and creates the account the
// first time), works once, and goes back to the page the person came from.
test.describe("auth.email-link", () => {
  test("a visitor opens the link from the email and is signed in where they started", async ({
    page,
  }) => {
    const email = newEmail("link");
    const since = new Date();
    await page.goto("/sign-in?next=/me");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const mail = await waitForMail(email, "sign-in", since);
    expect(mail.subject).toBe("Your SunTzu RC sign-in link");
    const link = linkIn(mail, `${API}/auth/magic-link/verify`);

    // Opened in the same browser, as when the mail app opens it.
    await page.goto(link);
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });

  test("the link works once", async ({ page, browser }) => {
    const email = newEmail("link");
    const since = new Date();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    const link = linkIn(
      await waitForMail(email, "sign-in", since),
      `${API}/auth/magic-link/verify`,
    );
    await page.goto(link);
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

    // The same link in another browser doesn't sign anyone in.
    const other = await (await browser.newContext()).newPage();
    await other.goto(link);
    await other.goto("/me");
    await expect(other).toHaveURL(/\/sign-in/);
    await other.context().close();
  });
});
