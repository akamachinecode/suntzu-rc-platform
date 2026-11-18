import { expect, test } from "@playwright/test";
import { API, APP } from "./env.ts";
import { profileOf, signedOut } from "./members.ts";
import { crewPage, newEmail, signIn, signedIn } from "./people.ts";

// docs/bits/account.get.md: a signed-in member opens My SunTzu RC (/me) and sees their own page:
// who they're signed in as, what they follow, where they're going and their private calendar link.
test.describe("account.get", () => {
  test("a new member opens My SunTzu RC and sees their own, empty page", async ({ page }) => {
    const email = await signedIn(page, "account");
    await page.goto("/me");

    await expect(page.getByRole("heading", { level: 1, name: "My SunTzu RC" })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}.`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Where you're going" })).toBeVisible();
    await expect(page.getByText("Nothing yet. Open an event and tap “I'm going”.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "What you follow" })).toBeVisible();
    await expect(
      page.getByText("Nothing yet. Look for the bell on events, clubs and fields."),
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Crew console" })).toHaveCount(0);

    // Their own private calendar, in the "Apple or Outlook" button.
    const profile = await profileOf(page.request);
    expect(profile).toMatchObject({
      email,
      role: "member",
      zip: null,
      changeAlerts: true,
      weeklyDigest: false,
    });
    expect(profile.calendarUrl.startsWith(`${APP}/calendar/`)).toBe(true);
    expect(new URL(profile.calendarUrl).pathname).toMatch(/^\/calendar\/[\w-]{20,64}\.ics$/);
    await expect(page.getByRole("heading", { level: 2, name: "Your own calendar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apple or Outlook" })).toHaveAttribute(
      "href",
      profile.calendarUrl.replace(/^http:/, "webcal:"),
    );
  });

  test("another member sees their own page, never this one's email or calendar", async ({
    page,
    browser,
  }) => {
    const email = await signedIn(page, "account");
    const mine = await profileOf(page.request);

    const other = await browser.newPage();
    const otherEmail = await signIn(other.request, newEmail("account-other"));
    await other.goto("/me");
    await expect(other.getByText(`Signed in as ${otherEmail}.`)).toBeVisible();
    await expect(other.getByText(email)).toHaveCount(0);
    const theirs = await profileOf(other.request);
    expect(theirs.email).toBe(otherEmail);
    expect(theirs.calendarUrl).not.toBe(mine.calendarUrl);
    await expect(other.getByRole("link", { name: "Apple or Outlook" })).not.toHaveAttribute(
      "href",
      mine.calendarUrl.replace(/^http:/, "webcal:"),
    );
    await other.context().close();
  });

  test("the crew sees the way to the crew console", async ({ browser }) => {
    const crew = await crewPage(browser);
    await crew.goto("/me");
    await expect(crew.getByRole("main").getByRole("link", { name: "Crew console" })).toBeVisible();
    await crew.context().close();
  });

  test("signed out, /me asks to sign in and the API answers 401", async ({ page, playwright }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fme$/);

    const anyone = await signedOut(playwright);
    const response = await anyone.get(`${API}/me`);
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("calendar");
    await anyone.dispose();
  });
});
