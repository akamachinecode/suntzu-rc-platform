import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { createNote, newMember, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";
import { unique } from "./data.ts";

// docs/bits/notes.create.md: a member adds a note on /notes. The title is required, the owner
// always comes from the session.
test.describe("notes.create", () => {
  test("a member adds a note and sees it in their list", async ({ page }) => {
    await signedIn(page, "notes");
    await page.goto("/notes");
    const title = unique("Call the field marshal");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Note").fill("Ask about the Sunday frequency board.");
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByRole("status")).toHaveText("Note saved.");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByText("Ask about the Sunday frequency board.")).toBeVisible();
    await expect(page.getByText("No notes yet.")).toHaveCount(0);
    // It's really saved: it's there after a reload.
    await page.reload();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });

  test("a note without a title is refused with a message, keeping what was typed", async ({
    page,
  }) => {
    await signedIn(page, "notes");
    await page.goto("/notes");
    await page.getByLabel("Note").fill("A body without a title.");
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByRole("status")).toHaveText("Please fix the highlighted field.");
    await expect(page.getByText("Give the note a title")).toBeVisible();
    await expect(page.getByLabel("Title")).toBeFocused();
    await expect(page.getByLabel("Title")).toHaveAccessibleDescription(/Give the note a title/);
    await expect(page.getByLabel("Note")).toHaveValue("A body without a title.");
    await expect(page.getByText("No notes yet.")).toBeVisible();
    expect(await (await page.request.get(`${API}/notes`)).json()).toEqual([]);
  });

  test("the owner comes from the session, never from the request", async ({ playwright }) => {
    const other = await newMember(playwright, "notes-other");
    const { user } = (await (await other.request.get(`${API}/auth/get-session`)).json()) as {
      user: { id: string };
    };

    // A member tries to write a note into someone else's list.
    const member = await newMember(playwright, "notes");
    const title = unique("Planted note");
    const response = await member.request.post(`${API}/notes`, {
      data: { title, ownerId: user.id, owner_id: user.id },
      headers: FROM_APP,
    });
    expect(response.status()).toBe(201);

    const theirs = (await (await other.request.get(`${API}/notes`)).json()) as { title: string }[];
    expect(theirs.map((note) => note.title)).not.toContain(title);
    const mine = (await (await member.request.get(`${API}/notes`)).json()) as { title: string }[];
    expect(mine.map((note) => note.title)).toContain(title);
    await Promise.all([member.request.dispose(), other.request.dispose()]);
  });

  test("the API checks the input again: no title or a title over 120 characters is a 400", async ({
    playwright,
  }) => {
    const member = await newMember(playwright, "notes");
    for (const title of ["   ", "x".repeat(121)]) {
      const response = await member.request.post(`${API}/notes`, {
        data: { title },
        headers: FROM_APP,
      });
      expect(response.status(), JSON.stringify(title.slice(0, 10))).toBe(400);
    }
    await createNote(member.request, "x".repeat(120));
    await member.request.dispose();
  });

  test("signed out, the API answers 401 and saves nothing", async ({ playwright }) => {
    const anyone = await signedOut(playwright);
    const response = await anyone.post(`${API}/notes`, {
      data: { title: unique("Anonymous note") },
      headers: FROM_APP,
    });
    expect(response.status()).toBe(401);
    await anyone.dispose();
  });
});
