import { expect, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { addOpenDay, expectStatus, newMember, publicEvent } from "./organisers.ts";
import { FROM_APP } from "./people.ts";

// docs/bits/crew.edit-event.md: the crew changes any event directly (PATCH /crew/events/{slug}); the
// public page shows it at once. There's no screen for it yet, so the test calls the API as the crew's
// tools do, and checks the page people read.
test.describe("crew.edit-event", () => {
  test("the crew fixes an event and its page shows it at once", async ({ page, playwright }) => {
    const { slug } = await addOpenDay(playwright, {
      name: unique("E2E Edit Typo Fyl-in"),
      startDate: inDays(35),
    });
    const name = unique("E2E Edit Fixed Open Day");
    const crew = await crewApi(playwright);
    const edited = await crew.patch(`${API}/crew/events/${slug}`, {
      data: {
        name,
        summary: "Fixed by the crew from the club's newsletter.",
        beginnerFriendly: true,
        resultsUrl: "https://example.com/edit-results",
        status: "cancelled",
      },
      headers: FROM_APP,
    });
    await expectStatus(edited, 204);
    await crew.dispose();

    // Same address (the slug stays, so links keep working), new details.
    await page.goto(`/events/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("Fixed by the crew from the club's newsletter.")).toBeVisible();
    await expect(page.getByText("Beginners welcome", { exact: true })).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Results/ })).toHaveAttribute(
      "href",
      "https://example.com/edit-results",
    );
  });

  test("a last day before the first is dropped, and wrong fields are refused", async ({
    playwright,
    request,
  }) => {
    const start = inDays(36);
    const { slug } = await addOpenDay(playwright, {
      name: unique("E2E Edit Dates"),
      startDate: start,
    });
    const crew = await crewApi(playwright);
    const patch = (data: Record<string, unknown>) =>
      crew.patch(`${API}/crew/events/${slug}`, { data, headers: FROM_APP });

    await expectStatus(await patch({ endDate: inDays(34) }), 204);
    expect((await publicEvent(request, slug)).endDate).toBeNull();
    await expectStatus(await patch({ endDate: inDays(37) }), 204);
    expect((await publicEvent(request, slug)).endDate).toBe(inDays(37));

    await expectStatus(await patch({ resultsUrl: "not a link" }), 400);
    await expectStatus(await patch({ status: "postponed" }), 400);
    await expectStatus(
      await crew.patch(`${API}/crew/events/no-such-event-${Date.now()}`, {
        data: { beginnerFriendly: true },
        headers: FROM_APP,
      }),
      404,
    );
    const event = await publicEvent(request, slug);
    expect(event).toMatchObject({
      startDate: start,
      endDate: inDays(37),
      resultsUrl: null,
      status: "announced",
    });
    await crew.dispose();
  });

  test("only the crew: a member gets 403 and a visitor 401, and nothing changes", async ({
    playwright,
    request,
  }) => {
    const { slug, name } = await addOpenDay(playwright, { name: unique("E2E Edit Not Crew") });
    const change = { data: { name: "Taken over", status: "cancelled" }, headers: FROM_APP };
    const { request: member } = await newMember(playwright);
    await expectStatus(await member.patch(`${API}/crew/events/${slug}`, change), 403);
    await member.dispose();
    const visitor = await playwright.request.newContext();
    await expectStatus(await visitor.patch(`${API}/crew/events/${slug}`, change), 401);
    await visitor.dispose();
    expect(await publicEvent(request, slug)).toMatchObject({ name, status: "announced" });
  });
});
