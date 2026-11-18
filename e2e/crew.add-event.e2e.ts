import { expect, test } from "@playwright/test";
import { inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { expectStatus, longDate, newMember, publicEvent } from "./organisers.ts";
import { crewPage, FROM_APP } from "./people.ts";

// docs/bits/crew.add-event.md: the crew types an event from a flyer in "Add an event" on /crew; it's
// published at once. A mistake is said next to its field and nothing typed is lost. Only the crew.
test.describe("crew.add-event", () => {
  test("the crew publishes an event from a flyer and it's public at once", async ({
    browser,
    request,
  }) => {
    const name = unique("E2E Flyer Open Day");
    const day = inDays(30);
    const page = await crewPage(browser);
    await page.goto("/crew");
    const form = page.getByRole("region", { name: "Add an event" });
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Kind").selectOption({ label: "Open day" });
    await form.getByRole("radio", { name: "Helicopters" }).check();
    await form.getByLabel("First day").fill(day);
    await form.getByLabel("Or where, in words").fill("Ocala, FL");
    await form.getByLabel("Organiser's page").fill("https://example.com/flyer-open-day");
    await form.getByLabel("Fee").fill("Landing fee $10");
    await form.getByLabel("One line about it").fill("Bring a heli, try a sim, meet the club.");
    await form.getByLabel("Welcomes beginners").check();
    await form.getByRole("button", { name: "Publish event" }).click();

    await expect(form.getByRole("status")).toContainText("Published.");
    await form.getByRole("link", { name: "See it" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText(longDate(day), { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Helicopters", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Beginners welcome", { exact: true })).toBeVisible();
    await expect(page.getByText("Bring a heli, try a sim, meet the club.")).toBeVisible();
    await expect(page.getByText("Landing fee $10")).toBeVisible();
    await expect(page.getByRole("link", { name: /Organiser's page/ })).toHaveAttribute(
      "href",
      "https://example.com/flyer-open-day",
    );

    // Anyone reads it, without the crew deciding anything.
    const slug = new URL(page.url()).pathname.split("/").at(-1)!;
    const event = await publicEvent(request, slug);
    expect(event).toMatchObject({
      name,
      startDate: day,
      placeText: "Ocala, FL",
      status: "announced",
    });
    await page.context().close();
  });

  test("a last day before the first is said next to it, and what was typed stays", async ({
    browser,
  }) => {
    const name = unique("E2E Flyer Backwards");
    const page = await crewPage(browser);
    await page.goto("/crew");
    const form = page.getByRole("region", { name: "Add an event" });
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("First day").fill(inDays(30));
    await form.getByLabel("Last day").fill(inDays(28));
    await form.getByLabel("Or where, in words").fill("Ocala, FL");
    await form.getByRole("button", { name: "Publish event" }).click();

    await expect(form.getByRole("status")).toHaveText(/Please fix the highlighted fields\./);
    const lastDay = form.getByLabel("Last day");
    await expect(lastDay).toHaveAttribute("aria-invalid", "true");
    await expect(lastDay).toHaveAccessibleDescription(/The last day can't be before the first\./);
    await expect(lastDay).toBeFocused();
    await expect(form.getByLabel("Name")).toHaveValue(name);
    await expect(form.getByLabel("First day")).toHaveValue(inDays(30));
    await expect(form.getByLabel("Or where, in words")).toHaveValue("Ocala, FL");

    // Fixed, it publishes.
    await lastDay.fill(inDays(31));
    await form.getByRole("button", { name: "Publish event" }).click();
    await expect(form.getByRole("status")).toContainText("Published.");
    await page.context().close();
  });

  test("only the crew adds events: a member gets 403 and a visitor 401", async ({
    playwright,
    request,
  }) => {
    const name = unique("E2E Not Crew");
    const event = {
      name,
      kind: "open-day",
      discipline: "air",
      startDate: inDays(30),
      placeText: "Ocala, FL",
    };
    const { request: member } = await newMember(playwright);
    await expectStatus(
      await member.post(`${API}/crew/events`, { data: event, headers: FROM_APP }),
      403,
    );
    await member.dispose();
    const visitor = await playwright.request.newContext();
    await expectStatus(
      await visitor.post(`${API}/crew/events`, { data: event, headers: FROM_APP }),
      401,
    );
    await visitor.dispose();
    // Nothing was published under that name.
    const search = await request.get(
      `${API}/events/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${inDays(30).slice(0, 4)}`,
    );
    await expectStatus(search, 404);
  });
});
