import { expect, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { addFlyIn, feedbackItem, openCrewConsole } from "./forms.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/crew.feedback.md: the crew reads the feedback people left after events on /crew
// ("Feedback after events") and marks each one as seen, which takes it off the list. Nobody else
// can read it.
test.describe("crew.feedback", () => {
  type Feedback = {
    id: string;
    event: { slug: string; name: string };
    right: boolean;
    note: string;
  };

  async function leaveFeedback(
    request: import("@playwright/test").APIRequestContext,
    slug: string,
    right: boolean,
    note: string,
  ) {
    const sent = await request.post(`${API}/events/${slug}/feedback`, {
      data: { right, note },
      headers: FROM_APP,
    });
    expect(sent.status()).toBe(204);
  }

  test("the crew reads feedback on /crew and marks it as seen", async ({
    browser,
    request,
    playwright,
  }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(-8) });
    const wrong = unique("The fee was 20 dollars, not 15.");
    const right = unique("All correct, great day.");
    await leaveFeedback(request, event.slug, false, wrong);
    await leaveFeedback(request, event.slug, true, right);

    const page = await openCrewConsole(browser);
    const wrongItem = feedbackItem(page, wrong);
    const rightItem = feedbackItem(page, right);
    await expect(wrongItem).toContainText(`Wrong about ${event.name}: “${wrong}”`);
    await expect(rightItem).toContainText(`Right about ${event.name}: “${right}”`);
    await expect(wrongItem.getByRole("link", { name: event.name })).toHaveAttribute(
      "href",
      `/events/${event.slug}`,
    );

    // "Seen: <event>" for screen readers; the button takes the feedback off the list.
    await wrongItem.getByRole("button", { name: new RegExp(`^Seen\\W+${event.name}$`) }).click();
    await expect(wrongItem).toHaveCount(0);
    await expect(rightItem).toBeVisible();
    await page.reload();
    await expect(feedbackItem(page, wrong)).toHaveCount(0);
    await expect(feedbackItem(page, right)).toBeVisible();
    await page.context().close();

    const crew = await crewApi(playwright);
    const list = (await (await crew.get(`${API}/crew/feedback`)).json()) as Feedback[];
    expect(list.some((item) => item.note === wrong)).toBe(false);
    expect(list.some((item) => item.note === right)).toBe(true);
    await crew.dispose();
  });

  test("an unknown feedback answers 404, and an id that isn't one 400", async ({ playwright }) => {
    const crew = await crewApi(playwright);
    const missing = await crew.post(
      `${API}/crew/feedback/00000000-0000-4000-8000-000000000000/seen`,
      { headers: FROM_APP },
    );
    expect(missing.status()).toBe(404);
    expect(
      (await crew.post(`${API}/crew/feedback/not-an-id/seen`, { headers: FROM_APP })).status(),
    ).toBe(400);
    await crew.dispose();
  });

  test("only the crew: 401 signed out, 403 for a member", async ({ page, request, playwright }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(-2) });
    const note = unique("Feedback only the crew may read.");
    await leaveFeedback(request, event.slug, false, note);
    const crew = await crewApi(playwright);
    const id = ((await (await crew.get(`${API}/crew/feedback`)).json()) as Feedback[]).find(
      (item) => item.note === note,
    )!.id;

    expect((await request.get(`${API}/crew/feedback`)).status()).toBe(401);
    expect(
      (await request.post(`${API}/crew/feedback/${id}/seen`, { headers: FROM_APP })).status(),
    ).toBe(401);

    await signedIn(page, "not-crew");
    expect((await page.request.get(`${API}/crew/feedback`)).status()).toBe(403);
    expect(
      (await page.request.post(`${API}/crew/feedback/${id}/seen`, { headers: FROM_APP })).status(),
    ).toBe(403);
    await page.goto("/crew");
    await expect(page.getByRole("heading", { level: 1, name: "Crew only" })).toBeVisible();
    await expect(page.getByText(note)).toHaveCount(0);

    // Still unseen.
    const list = (await (await crew.get(`${API}/crew/feedback`)).json()) as Feedback[];
    expect(list.some((item) => item.id === id)).toBe(true);
    await crew.dispose();
  });
});
