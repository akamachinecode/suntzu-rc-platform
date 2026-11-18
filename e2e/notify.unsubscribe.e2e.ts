import { expect, type Page, test } from "@playwright/test";
import { API, APP } from "./env.ts";
import { addEvent, crewApi, inDays, runJob } from "./data.ts";
import { linkIn, type Mail, waitForMail } from "./mail.ts";
import { follow, newMember, type Playwright, profileOf, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";

// docs/bits/notify.unsubscribe.md: every alert, digest and report email carries a secret link that
// stops it: the mail app's one-click button (List-Unsubscribe, RFC 8058) or the link in the email,
// whose page changes nothing until "Stop …" is pressed. No sign-in needed; the token is the key.
test.describe("notify.unsubscribe", () => {
  /**
   * A real change alert for `email`: they follow a new event, the crew moves it and the hourly
   * notify job runs (change alerts go out on every run). Returns the email. The member must have
   * opened My SunTzu RC once (`profileOf`): that's when their email settings and token are made.
   */
  async function changeAlertFor(
    playwright: Playwright,
    request: Page["request"],
    email: string,
  ): Promise<Mail> {
    const event = await addEvent(playwright, { kind: "fly-in", startDate: inDays(15) });
    await follow(request, "event", event.slug);
    const crew = await crewApi(playwright);
    const moved = await crew.patch(`${API}/crew/events/${event.slug}`, {
      data: { startDate: inDays(16) },
      headers: FROM_APP,
    });
    expect(moved.status()).toBe(204);
    await crew.dispose();
    const since = new Date();
    runJob("notify");
    return waitForMail(email, `Changed: ${event.name}`, since);
  }

  test("the link in a change alert stops change alerts, and only after pressing the button", async ({
    page,
    browser,
    playwright,
  }) => {
    const email = await signedIn(page, "unsubscribe");
    expect((await profileOf(page.request)).changeAlerts).toBe(true);
    const mail = await changeAlertFor(playwright, page.request, email);
    const link = linkIn(mail, `${APP}/unsubscribe?`);
    expect(new URL(link).searchParams.get("what")).toBe("alerts");

    // Opened from the mail app, in a browser that isn't signed in.
    const visitor = await browser.newPage();
    await visitor.goto(link);
    await expect(visitor.getByRole("heading", { level: 1, name: "Fewer emails." })).toBeVisible();
    const stop = visitor.getByRole("button", { name: "Stop change alerts" });
    await expect(stop).toBeVisible();
    // Opening the link (as mail scanners do) changes nothing.
    expect((await profileOf(page.request)).changeAlerts).toBe(true);

    await stop.click();
    await expect(visitor.getByRole("status")).toHaveText(
      "Done. You won't get change alerts any more. Change your mind in My SunTzu RC.",
    );
    expect((await profileOf(page.request)).changeAlerts).toBe(false);
    // Everything else stays as it was, and they see it in My SunTzu RC.
    await page.goto("/me");
    await expect(page.getByRole("checkbox", { name: /^Change alerts\./ })).not.toBeChecked();
    await expect(page.getByText(`Signed in as ${email}.`)).toBeVisible();
    await visitor.context().close();
  });

  test("the mail app's one-click unsubscribe stops change alerts", async ({ page, playwright }) => {
    const email = await signedIn(page, "unsubscribe");
    expect((await profileOf(page.request)).changeAlerts).toBe(true);
    const mail = await changeAlertFor(playwright, page.request, email);
    expect(mail.unsubscribeUrl).toMatch(
      new RegExp(`^${API}/unsubscribe\\?token=[\\w-]+&what=alerts$`),
    );

    // RFC 8058: the mail app POSTs to the List-Unsubscribe address, with no cookies.
    const mailApp = await signedOut(playwright);
    const response = await mailApp.post(mail.unsubscribeUrl!, {
      form: { "List-Unsubscribe": "One-Click" },
    });
    expect(response.status()).toBe(204);
    expect((await profileOf(page.request)).changeAlerts).toBe(false);
    await mailApp.dispose();
  });

  test("the same token stops the weekly email, and only for its own member", async ({
    page,
    playwright,
  }) => {
    const email = await signedIn(page, "unsubscribe");
    const updated = await page.request.patch(`${API}/me`, {
      data: { weeklyDigest: true },
      headers: FROM_APP,
    });
    expect(updated.status()).toBe(200);
    const other = await newMember(playwright, "unsubscribe-other");
    await other.request.patch(`${API}/me`, { data: { weeklyDigest: true }, headers: FROM_APP });

    const mail = await changeAlertFor(playwright, page.request, email);
    const token = new URL(mail.unsubscribeUrl!).searchParams.get("token")!;
    const anyone = await signedOut(playwright);
    const response = await anyone.post(`${API}/unsubscribe?token=${token}&what=digest`);
    expect(response.status()).toBe(204);

    expect(await profileOf(page.request)).toMatchObject({
      weeklyDigest: false,
      changeAlerts: true,
    });
    expect(await profileOf(other.request)).toMatchObject({
      weeklyDigest: true,
      changeAlerts: true,
    });
    await Promise.all([anyone.dispose(), other.request.dispose()]);
  });

  test("a link that doesn't work says so", async ({ page, playwright }) => {
    // A made-up token: the page offers the button, the API refuses it.
    await page.goto("/unsubscribe?token=e2eMadeUpEmailToken0123456789&what=alerts");
    await page.getByRole("button", { name: "Stop change alerts" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "That link doesn't work any more." }),
    ).toHaveText("That link doesn't work any more. Change your emails in My SunTzu RC.");

    // A link cut short in the email.
    await page.goto("/unsubscribe?token=e2eMadeUpEmailToken0123456789");
    await expect(
      page.getByText("This link is incomplete. Change your emails in My SunTzu RC."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Stop / })).toHaveCount(0);

    const anyone = await signedOut(playwright);
    for (const query of [
      "token=e2eMadeUpEmailToken0123456789&what=alerts",
      "token=short&what=alerts",
      "token=e2eMadeUpEmailToken0123456789&what=everything",
      "what=alerts",
    ]) {
      expect((await anyone.post(`${API}/unsubscribe?${query}`)).status(), query).toBe(404);
    }
    await anyone.dispose();
  });
});
