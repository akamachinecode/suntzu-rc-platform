import { expect, test, type Locator } from "@playwright/test";

// Anything that moves by itself can be paused (WCAG 2.2.2; spec 0010, slice 5).

/** The readout of the figure that owns this Pause button. */
const readoutOf = (button: Locator) =>
  button.locator("xpath=ancestor::figure[1]").locator("[data-readout]");

test("a figure's tour stops when Pause is pressed, and goes on with Play", async ({ page }) => {
  await page.goto("/guides/cars-and-crawlers");
  const pause = page.getByRole("button", { name: "Pause the animation" }).first();
  await pause.scrollIntoViewIfNeeded();
  const readout = readoutOf(pause);

  // The idle tour starts a moment after the figure comes into view.
  const before = await readout.textContent();
  await expect(readout).not.toHaveText(before ?? "", { timeout: 10_000 });

  await pause.click();
  const play = page.getByRole("button", { name: "Play the animation" }).first();
  await expect(play).toBeVisible();
  await page.waitForTimeout(500); // the drawing settles where it was going
  const stopped = await readout.textContent();
  await page.waitForTimeout(2_500);
  await expect(readout).toHaveText(stopped ?? "");

  await play.click();
  await expect(readout).not.toHaveText(stopped ?? "", { timeout: 10_000 });
});

test("the home's 3D scenes have a Pause button", async ({ page }) => {
  await page.goto("/");
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL in this browser: the scenes aren't built");
  const pause = page.getByRole("button", { name: "Pause the 3D scene" }).first();
  await pause.scrollIntoViewIfNeeded();
  await expect(pause).toBeVisible({ timeout: 15_000 });
  await pause.click();
  await expect(page.getByRole("button", { name: "Play the 3D scene" }).first()).toBeVisible();
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing moves, so there's no Pause button", async ({ page }) => {
    await page.goto("/guides/cars-and-crawlers");
    await page.waitForTimeout(1_500);
    await expect(page.getByRole("button", { name: "Pause the animation" })).toHaveCount(0);
  });
});
