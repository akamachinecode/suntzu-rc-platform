import { expect, test } from "@playwright/test";

// The whole site with a keyboard, reduced motion and the light-only design (spec 0010, slice 4).

test("the first Tab is 'Skip to content', and it lands on the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "a keyboard test");
  await page.goto("/events");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
});

test("the desktop menu marks the current page", async ({ page, isMobile }) => {
  test.skip(isMobile, "the desktop menu");
  await page.goto("/events");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Events" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Places" })).not.toHaveAttribute("aria-current");
});

test("Escape closes the phone menu and returns to its button", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the phone menu");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  await page.getByRole("link", { name: "Events" }).last().focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("search opened from the phone menu returns focus to the menu button", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the phone menu");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav").getByRole("link", { name: "Search" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("closing search returns the focus to the Search link", async ({ page, isMobile }) => {
  test.skip(isMobile, "the header link");
  await page.goto("/events");
  const link = page.getByRole("banner").getByRole("link", { name: "Search" });
  await link.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(link).toBeFocused();
});

test("a link to a section leaves its heading clear of the sticky header", async ({ page }) => {
  await page.goto("/learn");
  await page.evaluate(() => document.fonts.ready);
  // An in-page link, as the footer's "Rules and permits, sorted" is on this page.
  await page.evaluate(() => {
    location.hash = "rules";
  });
  // In-page links glide: wait until the page stops moving.
  await expect
    .poll(
      async () => {
        const before = await page.evaluate(() => scrollY);
        await page.waitForTimeout(150);
        return (await page.evaluate(() => scrollY)) === before;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
  const header = await page.locator("body > header").boundingBox();
  const target = await page.locator("#rules").boundingBox();
  expect(target!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
});

test("the page is light only, for the browser too", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "only light");
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
  ).toContain("light");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("dialogs fade without zooming", async ({ page, isMobile }) => {
    test.skip(isMobile, "the desktop search dialog");
    await page.goto("/");
    await page.getByRole("link", { name: "Search" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const scale = await dialog.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--tw-enter-scale").trim(),
    );
    expect(scale === "" || scale === "1").toBe(true);
  });
});

test("'Near me' says why it asks for the location", async ({ page }) => {
  await page.goto("/places");
  const button = page.getByRole("button", { name: "Near me" }).first();
  await expect(button).toHaveAccessibleDescription(/stays on this device/);
});
