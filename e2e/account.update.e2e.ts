import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { newMember, profileOf, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/account.update.md: a member changes their settings on /me ("Save"). ZIP is 5 digits or
// empty, the distance 5 to 300 miles, and each member only ever changes their own.
test.describe("account.update", () => {
  test("a member saves their settings and finds them kept", async ({ page }) => {
    const email = await signedIn(page, "settings");
    await page.goto("/me");

    await page.getByLabel("Your name").fill("Robin Example");
    await page.getByLabel("Home ZIP code").fill("32724");
    await page.getByRole("radio", { name: "Up to 120 miles" }).check();
    await page.getByRole("checkbox", { name: "Helicopters" }).check();
    await page.getByRole("checkbox", { name: "FPV drones" }).check();
    await page.getByRole("checkbox", { name: /^Change alerts\./ }).uncheck();
    await page.getByRole("checkbox", { name: /^This weekend near you\./ }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

    // Kept: after a reload the page greets them by name and shows what they chose.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Hi, Robin." })).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("Robin Example");
    await expect(page.getByLabel("Home ZIP code")).toHaveValue("32724");
    await expect(page.getByRole("radio", { name: "Up to 120 miles" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Helicopters" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "FPV drones" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Planes and jets" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /^Change alerts\./ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /^This weekend near you\./ })).toBeChecked();
    expect(await profileOf(page.request)).toMatchObject({
      name: "Robin Example",
      email,
      zip: "32724",
      radiusMiles: 120,
      disciplines: ["rotor", "fpv"],
      changeAlerts: false,
      weeklyDigest: true,
    });

    // An empty ZIP clears it.
    await page.getByLabel("Home ZIP code").fill("");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect.poll(async () => (await profileOf(page.request)).zip).toBeNull();
  });

  test("a ZIP code that isn't 5 digits isn't saved", async ({ page }) => {
    await signedIn(page, "settings");
    await page.goto("/me");
    const zip = page.getByLabel("Home ZIP code");
    await zip.fill("327");
    await page.getByRole("button", { name: "Save" }).click();

    // The browser stops the form at the field and says why.
    await expect(zip).toBeFocused();
    expect(await zip.evaluate((input: HTMLInputElement) => input.validationMessage)).not.toBe("");
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toHaveCount(0);
    expect((await profileOf(page.request)).zip).toBeNull();
  });

  test("a name that's too long is pointed out next to the field, keeping what was typed", async ({
    page,
  }) => {
    await signedIn(page, "settings");
    await page.goto("/me");
    const name = page.getByLabel("Your name");
    const long = "R".repeat(81);
    await name.fill(long);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Please fix the highlighted fields." }),
    ).toBeVisible();
    await expect(name).toHaveValue(long);
    // Each error is read with its field and the cursor goes there (spec 0010).
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleDescription(/\S/);
    expect((await profileOf(page.request)).name).toBe("");
  });

  test("the API checks every field again", async ({ playwright }) => {
    const member = await newMember(playwright, "settings");
    for (const data of [
      { zip: "327" },
      { zip: "3272a" },
      { radiusMiles: 4 },
      { radiusMiles: 301 },
      { disciplines: ["boats"] },
      { name: "R".repeat(81) },
    ]) {
      const response = await member.request.patch(`${API}/me`, { data, headers: FROM_APP });
      expect(response.status(), JSON.stringify(data)).toBe(400);
    }
    expect(await profileOf(member.request)).toMatchObject({
      name: "",
      zip: null,
      radiusMiles: 60,
      disciplines: [],
    });
    await member.request.dispose();
  });

  test("a member only ever changes their own settings", async ({ playwright }) => {
    const owner = await newMember(playwright, "settings");
    const before = await profileOf(owner.request);
    const other = await newMember(playwright, "settings-other");

    // Naming the other member's email in the request changes nothing of theirs.
    const response = await other.request.patch(`${API}/me`, {
      data: { name: "Someone Else", email: owner.email, zip: "33101" },
      headers: FROM_APP,
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      email: other.email,
      name: "Someone Else",
      zip: "33101",
    });
    expect(await profileOf(owner.request)).toEqual(before);
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("signed out, the API answers 401", async ({ playwright }) => {
    const anyone = await signedOut(playwright);
    const response = await anyone.patch(`${API}/me`, {
      data: { name: "Nobody" },
      headers: FROM_APP,
    });
    expect(response.status()).toBe(401);
    await anyone.dispose();
  });
});
