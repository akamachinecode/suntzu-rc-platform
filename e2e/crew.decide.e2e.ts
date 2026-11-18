import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import {
  addOpenDay,
  expectStatus,
  longDate,
  newMember,
  openReviewOf,
  publicEvent,
  suggestCorrection,
} from "./organisers.ts";
import { crewPage, FROM_APP } from "./people.ts";

// docs/bits/crew.decide.md: the crew decides a review on its card (Apply, Correct, Ignore) and the
// public page follows. The reviews here are members' corrections (`change` reviews): the engine's
// `new-event` and `merge` reviews only come from sources read on the internet, so they can't be
// made by the running system in these tests.
test.describe("crew.decide", () => {
  const card = (page: Page, event: string) =>
    page.getByRole("article").filter({ has: page.getByRole("link", { name: event, exact: true }) });

  test("Apply publishes the member's proposed change", async ({ browser, playwright, request }) => {
    const start = inDays(50);
    const moved = inDays(53);
    const { slug, name } = await addOpenDay(playwright, {
      name: unique("E2E Decide Apply"),
      startDate: start,
    });
    await suggestCorrection(playwright, slug, {
      startDate: moved,
      note: "Moved by three days, says the club.",
    });

    const page = await crewPage(browser);
    await page.goto("/crew");
    const review = card(page, name);
    await review.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(review).toHaveCount(0);

    await page.goto(`/events/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText(longDate(moved), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(longDate(start), { exact: true })).toHaveCount(0);
    expect((await publicEvent(request, slug)).startDate).toBe(moved);
    expect(await openReviewOf(playwright, slug)).toBeUndefined();
    await page.context().close();
  });

  test("Correct publishes the crew's own fix instead of the proposal", async ({
    browser,
    playwright,
    request,
  }) => {
    const proposed = inDays(61);
    const right = inDays(62);
    const { slug, name } = await addOpenDay(playwright, {
      name: unique("E2E Decide Correct"),
      startDate: inDays(60),
    });
    await suggestCorrection(playwright, slug, { startDate: proposed, note: "Moved by a day." });
    const fixed = `${name} (corrected)`;

    const page = await crewPage(browser);
    await page.goto("/crew");
    const review = card(page, name);
    await review.getByRole("button", { name: "Correct", exact: true }).click();
    await review.getByLabel("Name").fill(fixed);
    await review.getByLabel("First day").fill(right);
    await review.getByRole("button", { name: "Save and close" }).click();
    await expect(review).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Queue" }).getByRole("link", { name: fixed }),
    ).toHaveCount(0);

    await page.goto(`/events/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: fixed })).toBeVisible();
    await expect(page.getByText(longDate(right), { exact: true }).first()).toBeVisible();
    const event = await publicEvent(request, slug);
    expect(event.startDate).toBe(right);
    expect(event.name).toBe(fixed);
    await page.context().close();
  });

  test("Ignore changes nothing and takes the card away", async ({
    browser,
    playwright,
    request,
  }) => {
    const { slug, name } = await addOpenDay(playwright, { name: unique("E2E Decide Ignore") });
    await suggestCorrection(playwright, slug, { cancelled: true, note: "I heard it's off." });

    const page = await crewPage(browser);
    await page.goto("/crew");
    const review = card(page, name);
    await expect(review.getByRole("definition").filter({ hasText: "Cancelled" })).toBeVisible();
    await review.getByRole("button", { name: "Ignore", exact: true }).click();
    await expect(review).toHaveCount(0);

    await page.goto(`/events/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toHaveCount(0);
    expect((await publicEvent(request, slug)).status).toBe("announced");
    expect(await openReviewOf(playwright, slug)).toBeUndefined();
    await page.context().close();
  });

  test("only the crew decides, and a decided review can't be decided again", async ({
    playwright,
    request,
  }) => {
    const start = inDays(70);
    const { slug } = await addOpenDay(playwright, {
      name: unique("E2E Decide Rules"),
      startDate: start,
    });
    await suggestCorrection(playwright, slug, { startDate: inDays(71), note: "One day later." });
    const review = await openReviewOf(playwright, slug);
    expect(review?.kind).toBe("change");
    const decision = `${API}/crew/reviews/${review!.id}/decision`;

    // A member and a visitor can't decide it: nothing changes and it stays in the queue.
    const { request: member } = await newMember(playwright);
    await expectStatus(
      await member.post(decision, { data: { action: "approve" }, headers: FROM_APP }),
      403,
    );
    await member.dispose();
    const visitor = await playwright.request.newContext();
    await expectStatus(
      await visitor.post(decision, { data: { action: "approve" }, headers: FROM_APP }),
      401,
    );
    await visitor.dispose();
    expect((await publicEvent(request, slug)).startDate).toBe(start);
    expect((await openReviewOf(playwright, slug))?.id).toBe(review!.id);

    // The crew decides once; a second decision answers 404 and changes nothing.
    const crew = await crewApi(playwright);
    await expectStatus(
      await crew.post(decision, { data: { action: "reject" }, headers: FROM_APP }),
      204,
    );
    await expectStatus(
      await crew.post(decision, { data: { action: "approve" }, headers: FROM_APP }),
      404,
    );
    expect((await publicEvent(request, slug)).startDate).toBe(start);
    // Unknown reviews answer 404, and a decision that isn't one of the three 400.
    await expectStatus(
      await crew.post(`${API}/crew/reviews/${randomUUID()}/decision`, {
        data: { action: "approve" },
        headers: FROM_APP,
      }),
      404,
    );
    await expectStatus(
      await crew.post(decision, { data: { action: "publish" }, headers: FROM_APP }),
      400,
    );
    await crew.dispose();
  });
});
