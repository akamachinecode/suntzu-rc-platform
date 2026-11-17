import { expect, test } from "@playwright/test";

// What a page loads, and when (spec 0010, slice 6).

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

test("an event page's map loads only when it comes near", async ({ page, isMobile }) => {
  test.skip(!isMobile, "on a phone the map is below the fold");
  const [event] = (await (await fetch(`${API_URL}/events`)).json()) as { slug: string }[];
  test.skip(!event, "the API lists no events");
  const tiles: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("tiles.openfreemap.org")) tiles.push(request.url());
  });
  await page.goto(`/events/${event!.slug}`);
  const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  test.skip(!webgl, "no WebGL in this browser: the map shows a note instead");
  await page.waitForTimeout(1_500);
  expect(tiles, "no map tiles before the map is near").toHaveLength(0);

  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => tiles.length, { timeout: 15_000 }).toBeGreaterThan(0);
});
