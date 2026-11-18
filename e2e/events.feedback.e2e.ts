import { expect, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { addFlyIn, feedbackItem, openCrewConsole, type PlaywrightApi } from "./forms.ts";
import { FROM_APP } from "./people.ts";

// docs/bits/events.feedback.md: after an event, anyone can say whether its page was right
// ("Were you there? Was this information right?"). Anonymous; the crew reads it on /crew.
test.describe("events.feedback", () => {
  type Feedback = {
    id: string;
    event: { slug: string; name: string };
    right: boolean;
    note: string;
  };

  async function crewFeedback(playwright: PlaywrightApi): Promise<Feedback[]> {
    const crew = await crewApi(playwright);
    const response = await crew.get(`${API}/crew/feedback`);
    expect(response.status()).toBe(200);
    const list = (await response.json()) as Feedback[];
    await crew.dispose();
    return list;
  }

  test("a visitor says something was off on a past event and the crew reads it", async ({
    page,
    browser,
    playwright,
  }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(-6), endDate: inDays(-5) });
    const note = unique("The field moved to the north runway that weekend.");

    await page.goto(`/events/${event.slug}`);
    const after = page.getByRole("region", { name: "That was it" });
    await expect(after.getByText("Were you there? Was this information right?")).toBeVisible();
    const off = after.getByRole("button", { name: "Something was off" });
    await off.click();
    await expect(off).toHaveAttribute("aria-pressed", "true");
    await after.getByLabel("What was off? (optional)").fill(note);
    await after.getByRole("button", { name: "Send" }).click();
    await expect(after.getByRole("status")).toHaveText(
      "Thanks. It helps the next person who looks this up.",
    );

    // Anonymous: the crew sees the event, the answer and the note, nothing about who sent it.
    const saved = (await crewFeedback(playwright)).find((item) => item.note === note);
    expect(saved).toEqual({
      id: expect.any(String),
      event: { slug: event.slug, name: event.name },
      right: false,
      note,
      createdAt: expect.any(String),
    });

    const crew = await openCrewConsole(browser);
    const item = feedbackItem(crew, note);
    await expect(item).toContainText(`Wrong about ${event.name}: “${note}”`);
    await expect(item.getByRole("link", { name: event.name })).toHaveAttribute(
      "href",
      `/events/${event.slug}`,
    );
    await crew.context().close();
  });

  test('"Yes" with no note is enough', async ({ page, playwright }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(-3) });
    await page.goto(`/events/${event.slug}`);
    const after = page.getByRole("region", { name: "That was it" });
    await after.getByRole("button", { name: "Yes" }).click();
    await expect(after.getByLabel("Anything to add? (optional)")).toBeVisible();
    await after.getByRole("button", { name: "Send" }).click();
    await expect(after.getByRole("status")).toHaveText(
      "Thanks. It helps the next person who looks this up.",
    );

    const saved = (await crewFeedback(playwright)).filter((item) => item.event.slug === event.slug);
    expect(saved).toEqual([expect.objectContaining({ right: true, note: "" })]);
  });

  test("an upcoming event doesn't ask yet", async ({ page, playwright }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(12) });
    await page.goto(`/events/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: event.name })).toBeVisible();
    await expect(page.getByText("Was this information right?")).toHaveCount(0);
  });

  test("only published events, and only a yes or no with a short note", async ({
    request,
    playwright,
  }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(-4) });
    const send = (slug: string, data: object) =>
      request.post(`${API}/events/${slug}/feedback`, { data, headers: FROM_APP });

    expect((await send("no-such-event-e2e", { right: true })).status()).toBe(404);
    expect((await send(event.slug, {})).status()).toBe(400);
    expect((await send(event.slug, { right: "yes" })).status()).toBe(400);
    expect((await send(event.slug, { right: false, note: "x".repeat(1001) })).status()).toBe(400);
    expect((await crewFeedback(playwright)).some((item) => item.event.slug === event.slug)).toBe(
      false,
    );

    // No session needed.
    expect((await send(event.slug, { right: true, note: "Spot on." })).status()).toBe(204);
    expect(
      (await crewFeedback(playwright)).filter((item) => item.event.slug === event.slug),
    ).toHaveLength(1);
  });
});
