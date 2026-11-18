import { expect, test } from "@playwright/test";
import { API, APP, CREW_INBOX } from "./env.ts";
import { crewApi, unique } from "./data.ts";
import { crewMessages, mailsWith, waitForMailWith } from "./forms.ts";
import { FROM_APP, newEmail } from "./people.ts";

// docs/bits/messages.create.md: anyone can write to the crew (POST /messages, behind the contact
// form and "Show us your build"). The message waits in the crew's inbox and is emailed to
// CREW_INBOX; what doesn't pass the rules is refused and goes nowhere.
test.describe("messages.create", () => {
  const valid = () => ({
    kind: "contact",
    topic: "rules",
    name: unique("Writer"),
    email: newEmail("writer"),
    body: unique("Do I need to register a 250 g plane with the FAA?"),
  });

  test("a visitor's message reaches the crew's inbox and CREW_INBOX, without signing in", async ({
    request,
    playwright,
  }) => {
    const message = { ...valid(), link: "https://example.com/my-question" };
    const sent = await request.post(`${API}/messages`, { data: message, headers: FROM_APP });
    expect(sent.status()).toBe(204);

    const crew = await crewApi(playwright);
    const saved = (await crewMessages(crew)).find((item) => item.body === message.body);
    expect(saved).toMatchObject({
      kind: "contact",
      topic: "rules",
      name: message.name,
      email: message.email,
      link: "https://example.com/my-question",
      handled: false,
    });
    await crew.dispose();

    const mail = await waitForMailWith(CREW_INBOX, message.body);
    expect(mail.subject).toBe("New message on SunTzu RC: rules");
    expect(mail.text).toContain(`From ${message.name} <${message.email}>`);
    expect(mail.text).toContain("https://example.com/my-question");
    expect(mail.text).toContain(`${APP}/crew`);
  });

  test("a build is announced as a build", async ({ request }) => {
    const message = { ...valid(), kind: "build", topic: "Foam Cub" };
    expect(
      (await request.post(`${API}/messages`, { data: message, headers: FROM_APP })).status(),
    ).toBe(204);
    const mail = await waitForMailWith(CREW_INBOX, message.body);
    expect(mail.subject).toBe("New build on SunTzu RC: Foam Cub");
    expect(mail.text).toContain("Someone shared a build");
  });

  test("what breaks the rules is refused with 400 and reaches nobody", async ({
    request,
    playwright,
  }) => {
    const broken: [string, Record<string, unknown>][] = [
      ["no name", { name: "" }],
      ["an email that isn't one", { email: "not-an-email" }],
      ["a message under 10 characters", { body: "Too short" }],
      ["an unknown kind", { kind: "complaint" }],
      ["a topic over 40 characters", { topic: "x".repeat(41) }],
      ["a javascript: link", { link: "javascript:alert(1)" }],
      ["a data: link", { link: "data:text/html,<script>alert(1)</script>" }],
      ["a link without http(s)", { link: "ftp://example.com/plans.zip" }],
    ];
    const bodies: string[] = [];
    for (const [what, change] of broken) {
      const message = { ...valid(), ...change };
      if (typeof message.body === "string" && message.body.length >= 10) bodies.push(message.body);
      const response = await request.post(`${API}/messages`, { data: message, headers: FROM_APP });
      expect(response.status(), what).toBe(400);
    }

    const crew = await crewApi(playwright);
    const inbox = await crewMessages(crew);
    for (const body of bodies) {
      expect(inbox.some((item) => item.body === body)).toBe(false);
      expect(mailsWith(CREW_INBOX, body)).toHaveLength(0);
    }
    await crew.dispose();
  });
});
