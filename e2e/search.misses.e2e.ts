import { expect, type Page, test } from "@playwright/test";
import { crewApi } from "./data.ts";
import { API } from "./env.ts";
import { nonsense, openCrewConsole, type PlaywrightApi } from "./forms.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/search.misses.md: a search that finds nothing is counted, anonymously (the words only),
// and the crew reads the list on /crew ("Searched, not found"). The API searches again before
// counting, drops anything that looks personal, and only the crew can read the list.
test.describe("search.misses", () => {
  type Miss = { words: string; searches: number; results: number; lastOn: string };

  async function misses(playwright: PlaywrightApi): Promise<Miss[]> {
    const crew = await crewApi(playwright);
    const response = await crew.get(`${API}/search/misses`);
    expect(response.status()).toBe(200);
    const list = (await response.json()) as Miss[];
    await crew.dispose();
    return list;
  }

  /** Searches on /search like a visitor and waits for the page to report the miss. */
  async function searchNothing(page: Page, q: string) {
    const reported = page.waitForResponse(
      (response) =>
        response.url() === `${API}/search/misses` && response.request().method() === "POST",
    );
    await page.goto(`/search?q=${encodeURIComponent(q)}`);
    await expect(page.getByText(`Nothing found for “${q}”`)).toBeVisible();
    expect((await reported).status()).toBe(204);
  }

  test("a search that finds nothing reaches the crew's list, counted per search", async ({
    page,
    browser,
    playwright,
  }) => {
    // "aa" first: rows with the same count are listed alphabetically, so it stays in the top 50.
    const words = `aa${nonsense(10)} ${nonsense(8)}`;
    await searchNothing(page, words);
    expect((await misses(playwright)).find((miss) => miss.words === words)).toMatchObject({
      searches: 1,
      results: 0,
    });

    // Another visitor, typing it differently: the same words, counted twice.
    const other = await (await browser.newContext()).newPage();
    await searchNothing(other, words.toUpperCase());
    await other.context().close();
    expect((await misses(playwright)).find((miss) => miss.words === words)?.searches).toBe(2);

    const crew = await openCrewConsole(browser);
    const row = crew
      .getByRole("region", { name: "Searched, not found" })
      .getByRole("row")
      .filter({ hasText: words });
    await expect(row.getByRole("cell")).toHaveText([words, "2", "0", /^[A-Z][a-z]{2} \d{1,2}$/]);
    await expect(row.getByRole("link", { name: words })).toHaveAttribute("href", /^\/search\?q=/);
    await crew.context().close();
  });

  test("never counted: what the search finds, and what looks personal", async ({
    request,
    playwright,
  }) => {
    const word = nonsense(10);
    const personal = [`${word}@example.test`, `call ${word} 305 555 0199`, `1200 ${word} Ave`];
    // The page doesn't report these, and the API checks again whatever it's sent.
    for (const q of [...personal, "markham park"]) {
      const response = await request.post(`${API}/search/misses`, {
        data: { q },
        headers: FROM_APP,
      });
      expect(response.status(), q).toBe(204);
    }
    const list = await misses(playwright);
    expect(list.filter((miss) => miss.words.includes(word))).toEqual([]);
    expect(list.some((miss) => miss.words === "markham park")).toBe(false);
  });

  test("a report must be 1 to 100 characters", async ({ request }) => {
    expect(
      (await request.post(`${API}/search/misses`, { data: { q: "" }, headers: FROM_APP })).status(),
    ).toBe(400);
    expect(
      (
        await request.post(`${API}/search/misses`, {
          data: { q: "x".repeat(101) },
          headers: FROM_APP,
        })
      ).status(),
    ).toBe(400);
  });

  test("only the crew reads the list: 401 signed out, 403 for a member", async ({
    page,
    request,
  }) => {
    expect((await request.get(`${API}/search/misses`)).status()).toBe(401);
    await signedIn(page, "not-crew");
    expect((await page.request.get(`${API}/search/misses`)).status()).toBe(403);
    await page.goto("/crew");
    await expect(page.getByRole("heading", { level: 1, name: "Crew only" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Searched, not found" })).toHaveCount(0);
  });
});
