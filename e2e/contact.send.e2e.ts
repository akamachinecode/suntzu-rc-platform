import { expect, test } from "@playwright/test";
import { crewApi, unique } from "./data.ts";
import { APP, CREW_INBOX } from "./env.ts";
import { crewMessages, inboxItem, mailsWith, openCrewConsole, waitForMailWith } from "./forms.ts";
import { newEmail } from "./people.ts";

// docs/bits/contact.send.md: a visitor writes to the crew from /contact. The message waits in the
// crew's inbox at /crew and is emailed to CREW_INBOX. (apps/app/e2e/forms.spec.ts checks how the
// form answers errors: values kept, focus, descriptions.)
test.describe("contact.send", () => {
  test("a visitor sends the form and the crew gets it on /crew and by email", async ({
    page,
    browser,
  }) => {
    const name = unique("Ana Pilot");
    const email = newEmail("contact");
    const message = unique("I'd like lessons on a trainer near Fort Lauderdale.");

    await page.goto("/contact");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tell us what you want to do." }),
    ).toBeVisible();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("What can we help with?").selectOption({ label: "Lessons" });
    await page.getByLabel("Tell us a bit about you").fill(message);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Got it. One of us will reply within a couple of days.",
    );

    const mail = await waitForMailWith(CREW_INBOX, message);
    expect(mail.subject).toBe("New message on SunTzu RC: lessons");
    expect(mail.text).toContain(`From ${name} <${email}>`);
    expect(mail.text).toContain(`${APP}/crew`);

    const crew = await openCrewConsole(browser);
    const item = inboxItem(crew, message);
    await expect(item).toContainText(`lessons · ${name} <${email}>`);
    await expect(item.getByRole("button", { name: /Mark as handled/ })).toBeVisible();
    await crew.context().close();
  });

  test('the event page\'s "Tell us" link opens the form about a correction', async ({ page }) => {
    await page.goto("/contact?topic=correction");
    await expect(page.getByLabel("What can we help with?")).toHaveValue("correction");
    await expect(page.getByLabel("What can we help with?").locator("option:checked")).toHaveText(
      "Something wrong on an event",
    );
  });

  test("an invalid email is pointed out and nothing is sent", async ({ page, playwright }) => {
    const message = unique("This one should never reach the crew.");
    await page.goto("/contact");
    await page.getByLabel("Name", { exact: true }).fill("Ana Pilot");
    await page.getByLabel("Email", { exact: true }).fill("ana-at-example.test");
    await page.getByLabel("What can we help with?").selectOption({ label: "Something else" });
    await page.getByLabel("Tell us a bit about you").fill(message);
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("status")).toHaveText("Please fix the highlighted fields.");
    await expect(page.getByLabel("Email", { exact: true })).toHaveAccessibleDescription(
      /Please enter a valid email address\./,
    );
    const crew = await crewApi(playwright);
    expect((await crewMessages(crew)).some((item) => item.body === message)).toBe(false);
    await crew.dispose();
    expect(mailsWith(CREW_INBOX, message)).toHaveLength(0);
  });
});
