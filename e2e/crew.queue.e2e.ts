import { expect, type Page, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import {
  addOpenDay,
  expectStatus,
  newMember,
  openReviewOf,
  suggestCorrection,
} from "./organisers.ts";
import { crewPage, FROM_APP, signedIn } from "./people.ts";

// docs/bits/crew.queue.md: the crew opens /crew and sees what needs a person, oldest first, each card
// saying in plain words what would change. Nobody else sees the queue. Reviews here come from
// members' corrections (corrections.create): the engine's own need the internet.
test.describe("crew.queue", () => {
  const card = (page: Page, event: string) =>
    page.getByRole("article").filter({ has: page.getByRole("link", { name: event, exact: true }) });

  test("the crew sees a member's correction as a card, in plain words", async ({
    browser,
    playwright,
  }) => {
    const { slug, name } = await addOpenDay(playwright, {
      name: unique("E2E Queue Open Day"),
      startDate: inDays(40),
    });
    const moved = inDays(42);
    await suggestCorrection(playwright, slug, {
      startDate: moved,
      url: "https://example.com/queue-flyer",
      note: "The flyer says two days later.",
      sourceUrl: "https://example.com/queue-post",
    });

    const page = await crewPage(browser);
    await page.goto("/crew");
    await expect(page.getByRole("heading", { level: 1, name: "Crew console" })).toBeVisible();
    await expect(page.getByText(/^\d+ to review$/)).toBeVisible();

    const review = card(page, name);
    await expect(review.getByRole("heading", { name: /^Something changed/ })).toBeVisible();
    await expect(review.getByText("From a member")).toBeVisible();
    await expect(
      review.getByText("The flyer says two days later. — Seen at https://example.com/queue-post"),
    ).toBeVisible();
    // What we publish today, and the proposal with dates and links as words.
    const today = review.getByRole("region", { name: "What we publish" });
    await expect(today.getByText("Published today")).toBeVisible();
    await expect(today.getByText("Proposed change")).toBeVisible();
    const longDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${moved}T12:00:00Z`));
    await expect(today.getByRole("definition").filter({ hasText: longDate }).first()).toBeVisible();
    await expect(today.getByRole("definition").filter({ hasText: "Exact days" })).toBeVisible();
    await expect(
      today.getByRole("definition").filter({ hasText: "example.com/queue-flyer" }),
    ).toBeVisible();
    for (const button of ["Apply", "Correct", "Ignore"]) {
      await expect(review.getByRole("button", { name: button, exact: true })).toBeVisible();
    }
    await page.context().close();

    // Tidy up: the crew ignores it, so the queue doesn't grow run after run.
    const crew = await crewApi(playwright);
    const open = await openReviewOf(playwright, slug);
    await expectStatus(
      await crew.post(`${API}/crew/reviews/${open!.id}/decision`, {
        data: { action: "reject" },
        headers: FROM_APP,
      }),
      204,
    );
    await crew.dispose();
  });

  test("the oldest review comes first", async ({ browser, playwright }) => {
    const older = await addOpenDay(playwright, { name: unique("E2E Queue Older") });
    const newer = await addOpenDay(playwright, { name: unique("E2E Queue Newer") });
    await suggestCorrection(playwright, older.slug, {
      cancelled: true,
      note: "Older: it was called off.",
    });
    await suggestCorrection(playwright, newer.slug, {
      cancelled: true,
      note: "Newer: it was called off too.",
    });

    const page = await crewPage(browser);
    await page.goto("/crew");
    const queue = page.getByRole("region", { name: "Queue" });
    const names = await queue.getByRole("article").getByRole("link").allTextContents();
    expect(names.indexOf(older.name), "the older review is in the queue").toBeGreaterThanOrEqual(0);
    expect(names.indexOf(newer.name)).toBeGreaterThan(names.indexOf(older.name));
    await page.context().close();

    const crew = await crewApi(playwright);
    for (const slug of [older.slug, newer.slug]) {
      const open = await openReviewOf(playwright, slug);
      await expectStatus(
        await crew.post(`${API}/crew/reviews/${open!.id}/decision`, {
          data: { action: "reject" },
          headers: FROM_APP,
        }),
        204,
      );
    }
    await crew.dispose();
  });

  test("a member gets “Crew only”, and the API answers 403", async ({ page, playwright }) => {
    await signedIn(page);
    await page.goto("/crew");
    await expect(page.getByRole("heading", { level: 1, name: "Crew only" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Queue" })).toHaveCount(0);

    const { request } = await newMember(playwright);
    for (const path of ["summary", "reviews", "messages", "feedback"]) {
      await expectStatus(await request.get(`${API}/crew/${path}`), 403);
    }
    await request.dispose();
  });

  test("signed out, /crew asks to sign in, and the API answers 401", async ({
    page,
    playwright,
  }) => {
    await page.goto("/crew");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcrew$/);

    const visitor = await playwright.request.newContext();
    for (const path of ["summary", "reviews", "messages", "feedback"]) {
      await expectStatus(await visitor.get(`${API}/crew/${path}`), 401);
    }
    await visitor.dispose();
  });
});
