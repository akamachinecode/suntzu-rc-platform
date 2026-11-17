import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Every page a visitor can reach without signing in, checked with axe-core against WCAG 2.2 A and
// AA and axe's best practices (spec 0010). A serious or critical problem fails the check; the rest
// are listed in the report so they can be fixed too.

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

const STATIC_PAGES = [
  "/",
  "/learn",
  "/guides",
  "/guides/rc-planes",
  "/guides/rc-helicopters",
  "/guides/cars-and-crawlers",
  "/guides/flying-legally",
  "/events",
  "/places",
  "/places/can-i-fly-here",
  "/clubs",
  "/community",
  "/organise",
  "/contact",
  "/try",
  "/submit",
  "/search?q=field",
  "/sign-in",
  "/privacy",
  "/terms",
  "/this-page-does-not-exist",
];

/**
 * Findings checked by a person and accepted, each with its reason. Keep this list short: fix the
 * page instead whenever the finding is real.
 */
const ACCEPTED: { rule: string; within: string; why: string }[] = [
  {
    rule: "color-contrast",
    within: "#crew-title",
    why: "The home's decal letters are black (#000) on #d6d6d0, about 14:1. axe reads the white die-cut outline (-webkit-text-stroke) as the text colour.",
  },
  {
    rule: "target-size",
    within: ".maplibregl-map",
    why: "Map pins sit where the place is (WCAG 2.5.8's 'essential' exception), each has a 44 px tap area drawn by ::before that axe doesn't measure, and every pin is also in the list beside the map.",
  },
];

/** The first slug the API lists, so the check follows whatever data the database holds. */
async function firstSlug(path: string): Promise<string | undefined> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) return undefined;
  const items = (await response.json()) as { slug: string }[];
  return items[0]?.slug;
}

async function audit(page: Page, path: string) {
  await page.goto(path);
  // Maps keep fetching tiles, so "quiet" is waited for a few seconds at most.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    // Not ours: Next.js's dev overlay and Cloudflare Turnstile's frame.
    .exclude("nextjs-portal")
    .exclude('iframe[src*="challenges.cloudflare.com"]')
    .analyze();

  for (const violation of results.violations) {
    const kept = [];
    for (const node of violation.nodes) {
      const selector = node.target.join(" ");
      let accepted = false;
      for (const rule of ACCEPTED.filter((item) => item.rule === violation.id)) {
        accepted ||= await page
          .locator(selector)
          .first()
          .evaluate((element, within) => !!element.closest(within), rule.within)
          .catch(() => false);
      }
      if (!accepted) kept.push(node);
    }
    violation.nodes = kept;
  }
  results.violations = results.violations.filter((violation) => violation.nodes.length);

  const lines = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length}×)\n` +
      violation.nodes
        .slice(0, 3)
        .map((node) => `    ${node.target.join(" ")}`)
        .join("\n"),
  );
  if (lines.length) {
    await test.info().attach(`axe ${path}`, { body: lines.join("\n"), contentType: "text/plain" });
  }
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    blocking.map((violation) => lines[results.violations.indexOf(violation)]),
    `serious or critical accessibility problems on ${path}`,
  ).toEqual([]);
}

for (const path of STATIC_PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await audit(page, path);
  });
}

for (const [label, list, prefix] of [
  ["an event", "/events", "/events/"],
  ["a place", "/places", "/places/"],
  ["a club", "/hosts", "/clubs/"],
] as const) {
  test(`axe: ${label}'s page`, async ({ page }) => {
    const slug = await firstSlug(list);
    test.skip(!slug, `the API lists no ${list.slice(1)}`);
    await audit(page, `${prefix}${slug}`);
  });
}
