import { expect, test } from "@playwright/test";
import { API, APP } from "./env.ts";
import { addEvent } from "./data.ts";
import { createNote, follow, go, newMember, peopleOf, profileOf, signedOut } from "./members.ts";
import { FROM_APP, signIn, signedIn } from "./people.ts";

// docs/bits/account.delete.md: a member deletes their account from /me after typing "delete". Their
// session, settings, follows and "going" go with it; signing in again with the same email starts a
// new, empty account.
test.describe("account.delete", () => {
  test("a member deletes their account: the session is gone and signing in again starts fresh", async ({
    page,
    playwright,
  }) => {
    const email = await signedIn(page, "delete");
    const event = await addEvent(playwright, { kind: "fly-in" });
    await follow(page.request, "host", "deland-rc");
    await go(page.request, event.slug);
    const note = await createNote(page.request, "Gone with the account");
    const before = await profileOf(page.request);
    const calendarPath = new URL(before.calendarUrl).pathname;
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 1, going: 1 });

    await page.goto("/me");
    // Phones capitalise the first letter: "Delete" counts too.
    await page.getByLabel("Type “delete” to confirm").fill("Delete");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(`${APP}/?account=deleted`);

    // The session is gone: the API doesn't know them and /me asks to sign in.
    expect((await page.request.get(`${API}/me`)).status()).toBe(401);
    await page.goto("/me");
    await expect(page).toHaveURL(/\/sign-in\?next=(%2F|\/)me$/);
    // Their "going" and follows went with it, and so did their private calendar.
    expect(await peopleOf(playwright, "event", event.slug)).toEqual({ following: 0, going: 0 });
    expect((await page.request.get(calendarPath)).status()).toBe(404);

    // Signing in again with the same email starts a new, empty account.
    await signIn(page.request, email);
    await page.goto("/me");
    await expect(page.getByRole("heading", { level: 1, name: "My SunTzu RC" })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}.`)).toBeVisible();
    await expect(page.getByText("Nothing yet. Open an event and tap “I'm going”.")).toBeVisible();
    await expect(
      page.getByText("Nothing yet. Look for the bell on events, clubs and fields."),
    ).toBeVisible();
    const after = await profileOf(page.request);
    expect(after.calendarUrl).not.toBe(before.calendarUrl);
    expect((await page.request.get(`${API}/notes/${note.id}`)).status()).toBe(404);
  });

  test("without the confirmation word nothing is deleted", async ({ page }) => {
    const email = await signedIn(page, "delete");
    await page.goto("/me");
    const confirm = page.getByLabel("Type “delete” to confirm");
    for (const word of ["", "remove"]) {
      await confirm.fill(word);
      await page.getByRole("button", { name: "Delete my account" }).click();
      // The browser stops at the field and says what to type.
      await expect(confirm).toBeFocused();
      expect(await confirm.evaluate((input: HTMLInputElement) => input.validationMessage)).not.toBe(
        "",
      );
    }
    await expect(page).toHaveURL(`${APP}/me`);
    expect((await profileOf(page.request)).email).toBe(email);
  });

  test("a member can only delete their own account", async ({ playwright }) => {
    const owner = await newMember(playwright, "delete");
    const other = await newMember(playwright, "delete-other");
    const response = await other.request.delete(`${API}/me`, { headers: FROM_APP });
    expect(response.status()).toBe(204);
    expect((await other.request.get(`${API}/me`)).status()).toBe(401);
    expect((await profileOf(owner.request)).email).toBe(owner.email);
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("signed out, the API answers 401", async ({ playwright }) => {
    const anyone = await signedOut(playwright);
    expect((await anyone.delete(`${API}/me`, { headers: FROM_APP })).status()).toBe(401);
    await anyone.dispose();
  });
});
