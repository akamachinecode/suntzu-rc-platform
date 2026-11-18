import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { type APIRequestContext, expect, test } from "@playwright/test";
import { crewApi, inDays, unique } from "./data.ts";
import { API } from "./env.ts";
import { crewMessages, inboxItem, openCrewConsole } from "./forms.ts";
import { FROM_APP, newEmail, signedIn, signIn } from "./people.ts";

// docs/bits/submissions.create.md: a signed-in member sends an event from /submit, as a link or as
// pasted text. The tests run without the AI (BEDROCK_MODEL_ID unset) and never reach the internet,
// so pasted text lands in the crew's inbox for a person to read. Links people give are only ever
// fetched on the public internet: a link to this machine is never opened.
test.describe("submissions.create", () => {
  const flyer = (marker: string) =>
    `${marker}\nSpring Fun Fly at Markham Park, Saturday ${inDays(40)}, 9 am to 3 pm. AMA required, $10 landing fee. Hot dogs and a raffle.`;

  async function submit(request: APIRequestContext, data: object) {
    return request.post(`${API}/submissions`, { data, headers: FROM_APP });
  }

  test("a member pastes a flyer; without the AI it reaches the crew's inbox, credited to them", async ({
    page,
    browser,
    playwright,
  }) => {
    const email = await signedIn(page, "sender");
    const marker = unique("E2E flyer");
    await page.goto("/submit");
    await page.getByLabel("Paste the flyer or the post").fill(flyer(marker));
    await page.getByRole("button", { name: "Send the event" }).click();
    await expect(
      page.getByRole("heading", { name: "Thanks, a person will read it." }),
    ).toBeFocused();
    await expect(
      page.getByText(
        "We couldn't read it automatically, so it went to the crew's inbox. They'll add it by hand.",
      ),
    ).toBeVisible();

    const crew = await crewApi(playwright);
    const saved = (await crewMessages(crew)).find((message) => message.body.startsWith(marker));
    expect(saved).toMatchObject({
      kind: "contact",
      topic: "event",
      email,
      link: null,
      handled: false,
    });
    // The text as pasted (browsers send line breaks as CRLF).
    expect(saved!.body.replace(/\r\n/g, "\n")).toBe(flyer(marker));
    await crew.dispose();

    const queue = await openCrewConsole(browser);
    await expect(inboxItem(queue, marker)).toContainText(`event · ${saved!.name} <${email}>`);
    await queue.context().close();
  });

  test("signed out, the form asks to sign in and the API answers 401", async ({
    page,
    request,
    playwright,
  }) => {
    const marker = unique("E2E signed-out flyer");
    await page.goto("/submit");
    await page.getByLabel("Paste the flyer or the post").fill(flyer(marker));
    await page.getByRole("button", { name: "Send the event" }).click();
    await expect(
      page.getByText(/to send events, so we can credit you and tell you when it's live\./),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }),
    ).toHaveAttribute("href", "/sign-in?next=/submit");

    expect((await submit(request, { text: flyer(marker) })).status()).toBe(401);
    const crew = await crewApi(playwright);
    expect((await crewMessages(crew)).some((message) => message.body.includes(marker))).toBe(false);
    await crew.dispose();
  });

  test("a link to this machine is never opened: it goes to a person instead", async ({
    request,
    playwright,
  }) => {
    // A calendar on this machine that the API would read as an event if it ever fetched it.
    let hits = 0;
    const marker = unique("Local Only Fun Fly");
    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//e2e//EN",
      "BEGIN:VEVENT",
      `UID:${marker.replace(/\s/g, "-")}@example.test`,
      `DTSTART;VALUE=DATE:${inDays(45).replace(/-/g, "")}`,
      `SUMMARY:${marker}`,
      "LOCATION:Markham Park, Sunrise, FL",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const server: Server = createServer((_request, response) => {
      hits++;
      response.writeHead(200, { "content-type": "text/calendar" }).end(calendar);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    try {
      await signIn(request, newEmail("sender"));
      // Addresses and bare host names aren't links people share: refused before anything else.
      for (const url of [
        `http://127.0.0.1:${port}/events.ics`,
        `http://localhost:${port}/events.ics`,
        "http://[::1]/events.ics",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/events.ics",
      ]) {
        expect((await submit(request, { url })).status(), url).toBe(400);
      }

      // A name that looks public but points at this machine (*.localhost) passes the form's check;
      // the API still never opens it, and a person reads it instead.
      const url = `http://e2e.localhost:${port}/events.ics`;
      const response = await submit(request, { url });
      expect(response.status()).toBe(201);
      expect(await response.json()).toEqual({ outcome: "inbox", events: [] });
      expect(hits).toBe(0);

      const crew = await crewApi(playwright);
      const saved = (await crewMessages(crew)).find((message) => message.link === url);
      expect(saved).toMatchObject({ topic: "event", body: `Event link: ${url}`, handled: false });
      await crew.dispose();
    } finally {
      server.close();
    }
  });

  test("the rules: a web link or a couple of lines of text", async ({ page, request }) => {
    await signIn(request, newEmail("sender"));
    for (const [what, data] of [
      ["nothing", {}],
      ["text too short", { text: "Fun fly Sat" }],
      ["a javascript: link", { url: "javascript:alert(1)" }],
      ["a file: link", { url: "file:///etc/passwd" }],
      ["an ftp: link", { url: "ftp://example.com/flyer.pdf" }],
      ["text over 8000 characters", { text: "x".repeat(8001) }],
    ] as const) {
      expect((await submit(request, data)).status(), what).toBe(400);
    }

    // The form says what's missing and keeps what was typed.
    await signedIn(page, "sender");
    await page.goto("/submit");
    await page.getByLabel("Paste the flyer or the post").fill("Fun fly Sat");
    await page.getByRole("button", { name: "Send the event" }).click();
    await expect(page.getByRole("status")).toHaveText("Paste a link or the event's text.");
    await expect(page.getByLabel("Paste the flyer or the post")).toHaveValue("Fun fly Sat");
    await expect(page.getByLabel("Paste the flyer or the post")).toHaveAccessibleDescription(
      /Paste a link to the event, or its text \(at least a couple of lines\)\./,
    );
  });

  test("at most 10 events a member an hour", async ({ request, playwright }) => {
    await signIn(request, newEmail("sender"));
    const tag = unique("E2E quota flyer");
    for (let n = 1; n <= 10; n++) {
      const sent = await submit(request, { text: flyer(`${tag} #${n}`) });
      expect(sent.status(), `event ${n}`).toBe(201);
    }
    const refused = await submit(request, { text: flyer(`${tag} #11`) });
    expect(refused.status()).toBe(429);
    expect(((await refused.json()) as { message: string }).message).toBe(
      "That's a lot of events at once. Try again in an hour.",
    );

    // The crew clears these test messages from its inbox.
    const crew = await crewApi(playwright);
    const mine = (await crewMessages(crew)).filter((message) => message.body.startsWith(tag));
    expect(mine).toHaveLength(10);
    for (const message of mine) {
      expect(
        (
          await crew.post(`${API}/crew/messages/${message.id}/handled`, { headers: FROM_APP })
        ).status(),
      ).toBe(204);
    }
    await crew.dispose();
  });
});
