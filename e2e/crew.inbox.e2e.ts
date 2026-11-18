import { expect, test } from "@playwright/test";
import { crewApi, unique } from "./data.ts";
import { API } from "./env.ts";
import { crewMessages, inboxItem, openCrewConsole, sendMessage } from "./forms.ts";
import { FROM_APP, newEmail, signedIn } from "./people.ts";

// docs/bits/crew.inbox.md: the crew reads what visitors wrote (contact form, builds, events nobody
// could read) on /crew and marks each one as handled. Nobody else can read or touch it.
test.describe("crew.inbox", () => {
  test("the crew reads a message on /crew and marks it as handled", async ({
    browser,
    request,
    playwright,
  }) => {
    const name = unique("Inbox Reader");
    const email = newEmail("inbox");
    const body = unique("Can someone show my kid how to fly a trainer?");
    await sendMessage(request, {
      topic: "lessons",
      name,
      email,
      body,
      link: "https://example.com/my-trainer",
    });

    const page = await openCrewConsole(browser);
    const item = inboxItem(page, body);
    await expect(item).toBeVisible();
    // What it's about, who wrote (with a link to reply) and the link they gave.
    await expect(item).toContainText(`lessons · ${name} <${email}>`);
    await expect(item.getByRole("link", { name: email })).toHaveAttribute(
      "href",
      `mailto:${email}`,
    );
    await expect(
      item.getByRole("link", { name: "https://example.com/my-trainer" }),
    ).toHaveAttribute("href", "https://example.com/my-trainer");

    // The button says whose message it is to screen readers ("Mark as handled: <name>").
    await item.getByRole("button", { name: new RegExp(`^Mark as handled\\W+${name}$`) }).click();
    // Handled messages stay in the list, without the button.
    await expect(item.getByRole("button", { name: /Mark as handled/ })).toHaveCount(0);
    await expect(item).toBeVisible();
    await page.reload();
    await expect(
      inboxItem(page, body).getByRole("button", { name: /Mark as handled/ }),
    ).toHaveCount(0);

    const crew = await crewApi(playwright);
    const saved = (await crewMessages(crew)).find((message) => message.body === body);
    expect(saved).toMatchObject({ kind: "contact", topic: "lessons", name, email, handled: true });
    await crew.dispose();
    await page.context().close();
  });

  test("messages still to handle come first, newest first", async ({ request, playwright }) => {
    const older = unique("Older message to the crew");
    const newer = unique("Newer message to the crew");
    await sendMessage(request, { name: "Older Writer", email: newEmail("inbox"), body: older });
    await sendMessage(request, { name: "Newer Writer", email: newEmail("inbox"), body: newer });

    const crew = await crewApi(playwright);
    const at = (list: { body: string }[], body: string) =>
      list.findIndex((message) => message.body === body);
    let list = await crewMessages(crew);
    expect(at(list, older)).toBeGreaterThan(at(list, newer));
    expect(at(list, newer)).toBeGreaterThanOrEqual(0);

    // Once the newer one is handled, it goes below every message still to handle.
    const id = list[at(list, newer)]!.id;
    const handled = await crew.post(`${API}/crew/messages/${id}/handled`, { headers: FROM_APP });
    expect(handled.status()).toBe(204);
    list = await crewMessages(crew);
    expect(at(list, newer)).toBeGreaterThan(at(list, older));
    expect(list.slice(0, at(list, newer)).every((message) => !message.handled)).toBe(true);
    await crew.dispose();
  });

  test("an unknown message answers 404, and an id that isn't one 400", async ({ playwright }) => {
    const crew = await crewApi(playwright);
    const missing = await crew.post(
      `${API}/crew/messages/00000000-0000-4000-8000-000000000000/handled`,
      {
        headers: FROM_APP,
      },
    );
    expect(missing.status()).toBe(404);
    const invalid = await crew.post(`${API}/crew/messages/not-an-id/handled`, {
      headers: FROM_APP,
    });
    expect(invalid.status()).toBe(400);
    await crew.dispose();
  });

  test("only the crew: 401 signed out, 403 for a member, and /crew says so", async ({
    page,
    request,
    playwright,
  }) => {
    const body = unique("A message only the crew may read");
    await sendMessage(request, { name: "Private Writer", email: newEmail("inbox"), body });
    const crew = await crewApi(playwright);
    const id = (await crewMessages(crew)).find((message) => message.body === body)!.id;
    await crew.dispose();

    // Signed out.
    expect((await request.get(`${API}/crew/messages`)).status()).toBe(401);
    expect(
      (await request.post(`${API}/crew/messages/${id}/handled`, { headers: FROM_APP })).status(),
    ).toBe(401);
    await page.goto("/crew");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcrew$/);

    // A member who isn't in the crew.
    await signedIn(page, "not-crew");
    expect((await page.request.get(`${API}/crew/messages`)).status()).toBe(403);
    expect(
      (
        await page.request.post(`${API}/crew/messages/${id}/handled`, { headers: FROM_APP })
      ).status(),
    ).toBe(403);
    await page.goto("/crew");
    await expect(page.getByRole("heading", { level: 1, name: "Crew only" })).toBeVisible();
    await expect(page.getByText(body)).toHaveCount(0);

    // Still waiting for the crew.
    const check = await crewApi(playwright);
    expect((await crewMessages(check)).find((message) => message.id === id)?.handled).toBe(false);
    await check.dispose();
  });
});
