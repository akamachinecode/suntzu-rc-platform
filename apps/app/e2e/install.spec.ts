import { expect, test } from "@playwright/test";

// The site can be added to a phone's home screen (spec 0010, slice 9; modern web guidance,
// pwa/install-web-app).

test("the manifest has a stable id, a name and icons that load", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    id: "/",
    name: "SunTzu RC",
    start_url: "/",
    display: "standalone",
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
    true,
  );
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(icon.src);
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("Chromium sees nothing stopping installation", async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== "chromium" || isMobile, "Chromium's installability check");
  await page.goto("/");
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});
