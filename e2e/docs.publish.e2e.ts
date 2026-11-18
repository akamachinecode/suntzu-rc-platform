import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { expect, test } from "@playwright/test";

// docs/bits/docs.publish.md: the docs portal is the repository's own documents, built into a static
// site (apps/docs/out) that .github/workflows/docs.yml uploads to GitHub Pages as it is. The
// workflow itself can't run in a test: this serves the very folder it would upload (built by
// `pnpm build`, which `pnpm test:e2e` runs first) the way GitHub Pages does, and reads it.
const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "apps", "docs", "out");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** The `# Title` on the first line of a document. */
const titleOf = (file: string) =>
  readFileSync(path.join(root, file), "utf8").split("\n")[0]!.replace(/^#\s+/, "");

test.describe("docs.publish", () => {
  let server: Server;
  let portal: string;

  test.beforeAll(async () => {
    expect(
      existsSync(path.join(OUT, "index.html")),
      "apps/docs/out is missing: build the portal first (pnpm build; pnpm test:e2e does it)",
    ).toBe(true);
    // As GitHub Pages serves a folder: index.html for a folder, the site's 404.html for nothing.
    server = createServer((request, response) => {
      const url = decodeURIComponent(new URL(request.url ?? "/", "http://portal").pathname);
      let file = path.join(OUT, path.normalize(url));
      if (file.startsWith(OUT) && existsSync(file) && statSync(file).isDirectory()) {
        file = path.join(file, "index.html");
      }
      if (!file.startsWith(OUT) || !existsSync(file)) {
        response.writeHead(404, { "content-type": TYPES[".html"] });
        response.end(readFileSync(path.join(OUT, "404.html")));
        return;
      }
      response.writeHead(200, {
        "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      });
      response.end(readFileSync(file));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    portal = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test.afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  test("the home page is docs/README.md, with the portal's sections", async ({ page }) => {
    await page.goto(`${portal}/`);
    await expect(page).toHaveTitle(/SunTzu RC docs/);
    await expect(
      page.getByRole("heading", { level: 1, name: titleOf("docs/README.md") }),
    ).toBeVisible();
    for (const section of [
      "Guides",
      "Architecture",
      "Operations",
      "Project",
      "Specifications",
      "Bits",
    ]) {
      await expect(
        page.getByRole("complementary").getByText(section, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test("a link between documents leads to the other document's page", async ({ page }) => {
    await page.goto(`${portal}/bits/`);
    await expect(
      page.getByRole("heading", { level: 1, name: titleOf("docs/bits/README.md") }),
    ).toBeVisible();
    // The catalog links to ./notify.digest.md: in the portal, that document's page.
    await page.getByRole("main").getByRole("link", { name: "notify.digest", exact: true }).click();
    await expect(page).toHaveURL(`${portal}/bits/notify-digest/`);
    await expect(
      page.getByRole("heading", { level: 1, name: titleOf("docs/bits/notify.digest.md") }),
    ).toBeVisible();
  });

  test("a link to something that isn't a document goes to the file on GitHub", async ({ page }) => {
    // docs/DELIVERY.md links to ../.github/workflows/docs.yml and ../apps/docs.
    await page.goto(`${portal}/architecture/from-code-to-production/`);
    await expect(
      page.getByRole("heading", { level: 1, name: titleOf("docs/DELIVERY.md") }),
    ).toBeVisible();
    const repository = "https://github.com/akamachinecode/suntzu-rc-platform";
    await expect(page.getByRole("link", { name: "docs.yml", exact: true })).toHaveAttribute(
      "href",
      `${repository}/blob/main/.github/workflows/docs.yml`,
    );
    await expect(
      page.getByRole("link", { name: "apps/docs", exact: true }).first(),
    ).toHaveAttribute("href", `${repository}/tree/main/apps/docs`);
  });

  test("from the home page, every page can be reached and no link leads nowhere", async ({
    request,
  }) => {
    // Every page the build wrote (one folder with an index.html per document)…
    const pages = (function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        if (!statSync(full).isDirectory()) return name === "index.html" ? [dir] : [];
        return name.startsWith("_") || name === "404" ? [] : walk(full);
      });
    })(OUT).map((dir) => `/${path.relative(OUT, dir)}/`.replace(/^\/\/$/, "/"));
    expect(pages.length).toBeGreaterThan(50);

    // …is reached by following the portal's own links from the home page, and none of them is broken.
    const from = new Map<string, string>([["/", "(start)"]]);
    const queue = ["/"];
    const reached = new Set<string>();
    const broken: string[] = [];
    while (queue.length) {
      const url = queue.shift()!;
      const response = await request.get(`${portal}${url}`);
      if (response.status() !== 200) {
        broken.push(`${url} (linked from ${from.get(url)})`);
        continue;
      }
      if (!response.headers()["content-type"]?.startsWith("text/html")) continue;
      reached.add(url);
      for (const [, href] of (await response.text()).matchAll(/<a [^>]*href="(\/(?!\/)[^"#?]*)/g)) {
        if (from.has(href!)) continue;
        from.set(href!, url);
        queue.push(href!);
      }
    }
    expect(broken).toEqual([]);
    expect(pages.filter((page) => !reached.has(page))).toEqual([]);
  });
});
