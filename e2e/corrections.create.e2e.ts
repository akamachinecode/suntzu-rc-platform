import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { addFlyIn, openCrewConsole } from "./forms.ts";
import { FROM_APP, newEmail, signedIn, signIn } from "./people.ts";

// docs/bits/corrections.create.md: a signed-in member suggests a correction on an event's page. It
// waits in the crew's queue (/crew) as "Something changed", from a member, and the event doesn't
// change until the crew decides.
test.describe("corrections.create", () => {
  type Review = {
    id: string;
    kind: string;
    note: string;
    proposal: Record<string, unknown>;
    fromMember: boolean;
    event: { slug: string } | null;
  };

  async function openReviews(crew: APIRequestContext): Promise<Review[]> {
    const response = await crew.get(`${API}/crew/reviews`);
    expect(response.status()).toBe(200);
    return (await response.json()) as Review[];
  }

  async function openForm(page: Page, slug: string) {
    await page.goto(`/events/${slug}`);
    const sources = page.getByRole("region", { name: "Where this comes from" });
    await sources.getByRole("button", { name: "Suggest a correction" }).click();
    return sources;
  }

  test("a member suggests new dates; the crew sees it in the queue and the event waits", async ({
    page,
    browser,
    playwright,
  }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(20), endDate: inDays(21) });
    const note = unique("The club moved it a week later because of the county fair.");
    await signedIn(page, "corrector");

    const form = await openForm(page, event.slug);
    await form.getByLabel("Right first day").fill(inDays(27));
    await form.getByLabel("Right last day").fill(inDays(28));
    await form.getByLabel("What's wrong").fill(note);
    await form.getByLabel("Where you saw it (link)").fill("https://example.com/club-news");
    await form.getByRole("button", { name: "Send to the crew" }).click();
    await expect(
      form.getByText("Thanks! The crew will check it against the source."),
    ).toBeFocused();

    // Never applied without the crew: the event still has its old dates.
    const published = await page.request.get(`${API}/events/${event.slug}`);
    expect(((await published.json()) as { startDate: string }).startDate).toBe(inDays(20));

    const crew = await crewApi(playwright);
    const review = (await openReviews(crew)).find((item) => item.note.startsWith(note));
    expect(review).toMatchObject({
      kind: "change",
      fromMember: true,
      note: `${note} — Seen at https://example.com/club-news`,
      proposal: { startDate: inDays(27), endDate: inDays(28), datePrecision: "day" },
      event: { slug: event.slug },
    });
    await crew.dispose();

    const queue = await openCrewConsole(browser);
    const card = queue
      .getByRole("region", { name: "Queue" })
      .getByRole("article")
      .filter({ hasText: note });
    await expect(card.getByRole("heading", { name: /Something changed/ })).toContainText(
      "From a member",
    );
    await expect(card.getByRole("link", { name: event.name })).toHaveAttribute(
      "href",
      `/events/${event.slug}`,
    );
    await expect(card).toContainText("Proposed change");
    await queue.context().close();
  });

  test("a new first day alone keeps the event's length", async ({ request, playwright }) => {
    const event = await addFlyIn(playwright, { startDate: inDays(30), endDate: inDays(32) });
    await signIn(request, newEmail("corrector"));
    const note = unique("Moved forward a day.");
    const sent = await request.post(`${API}/events/${event.slug}/corrections`, {
      data: { startDate: inDays(29), note },
      headers: FROM_APP,
    });
    expect(sent.status()).toBe(204);
    const crew = await crewApi(playwright);
    const review = (await openReviews(crew)).find((item) => item.note === note);
    expect(review?.proposal).toMatchObject({ startDate: inDays(29), endDate: inDays(31) });
    await crew.dispose();
  });

  test("signed out, the form asks to sign in and the API answers 401", async ({
    page,
    request,
    playwright,
  }) => {
    const event = await addFlyIn(playwright);
    const note = unique("A visitor who isn't signed in.");
    const form = await openForm(page, event.slug);
    await form.getByLabel("What's wrong").fill(note);
    await form.getByRole("button", { name: "Send to the crew" }).click();
    await expect(form.getByText(/to suggest a correction, or/)).toBeVisible();
    await expect(form.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      `/sign-in?next=/events/${event.slug}`,
    );
    await expect(form.getByRole("link", { name: "write to us" })).toHaveAttribute(
      "href",
      "/contact?topic=correction",
    );

    const response = await request.post(`${API}/events/${event.slug}/corrections`, {
      data: { note },
      headers: FROM_APP,
    });
    expect(response.status()).toBe(401);
    const crew = await crewApi(playwright);
    expect((await openReviews(crew)).some((item) => item.note.includes(note))).toBe(false);
    await crew.dispose();
  });

  test("the rules: a note, web links, dates in order, a published event", async ({
    request,
    playwright,
  }) => {
    const event = await addFlyIn(playwright);
    await signIn(request, newEmail("corrector"));
    const note = unique("Checking the rules.");
    const send = (slug: string, data: object) =>
      request.post(`${API}/events/${slug}/corrections`, { data, headers: FROM_APP });

    for (const [what, data] of [
      ["no note", { cancelled: true }],
      ["a note under 5 characters", { note: "bad" }],
      ["a javascript: source", { note, sourceUrl: "javascript:alert(1)" }],
      ["a page that isn't a web link", { note, url: "ftp://example.com/event" }],
      ["a date that isn't one", { note, startDate: "next Saturday" }],
    ] as const) {
      expect((await send(event.slug, data)).status(), what).toBe(400);
    }
    const backwards = await send(event.slug, { note, startDate: inDays(15), endDate: inDays(14) });
    expect(backwards.status()).toBe(400);
    expect(((await backwards.json()) as { message: string }).message).toBe(
      "The last day can't be before the first.",
    );
    expect((await send("no-such-event-e2e", { note })).status()).toBe(404);

    const crew = await crewApi(playwright);
    expect((await openReviews(crew)).some((item) => item.note.includes(note))).toBe(false);
    await crew.dispose();
  });

  test("at most 20 corrections a member an hour", async ({ request, playwright }) => {
    const event = await addFlyIn(playwright);
    await signIn(request, newEmail("corrector"));
    const tag = unique("Quota check");
    for (let n = 1; n <= 20; n++) {
      const sent = await request.post(`${API}/events/${event.slug}/corrections`, {
        data: { note: `${tag} #${n}` },
        headers: FROM_APP,
      });
      expect(sent.status(), `correction ${n}`).toBe(204);
    }
    const refused = await request.post(`${API}/events/${event.slug}/corrections`, {
      data: { note: `${tag} #21` },
      headers: FROM_APP,
    });
    expect(refused.status()).toBe(429);
    expect(((await refused.json()) as { message: string }).message).toBe(
      "That's a lot of corrections at once. Try again in an hour.",
    );

    // Another member isn't held back.
    const other = await playwright.request.newContext();
    await signIn(other, newEmail("corrector"));
    const fine = await other.post(`${API}/events/${event.slug}/corrections`, {
      data: { note: `${tag} other` },
      headers: FROM_APP,
    });
    expect(fine.status()).toBe(204);
    await other.dispose();

    // The crew clears these test corrections from its queue ("Ignore").
    const crew = await crewApi(playwright);
    const mine = (await openReviews(crew)).filter((item) => item.note.startsWith(tag));
    expect(mine).toHaveLength(21);
    for (const review of mine) {
      const ignored = await crew.post(`${API}/crew/reviews/${review.id}/decision`, {
        data: { action: "reject" },
        headers: FROM_APP,
      });
      expect(ignored.status()).toBe(204);
    }
    await crew.dispose();
  });
});
