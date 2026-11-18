import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { createNote, newMember, signedOut } from "./members.ts";
import { FROM_APP, signedIn } from "./people.ts";
import { unique } from "./data.ts";

// docs/bits/notes.delete.md: a member deletes one of their notes on /notes. Only the owner can, and
// someone else's note answers 404 (not 403).
test.describe("notes.delete", () => {
  test("a member deletes one of their notes", async ({ page }) => {
    await signedIn(page, "notes");
    const gone = unique("Delete me");
    const kept = unique("Keep me");
    await createNote(page.request, kept);
    const created = await createNote(page.request, gone);
    await page.goto("/notes");
    await expect(page.getByText(gone, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Delete “${gone}”` }).click();
    await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    await expect(page.getByText(kept, { exact: true })).toBeVisible();
    expect((await page.request.get(`${API}/notes/${created.id}`)).status()).toBe(404);

    await page.getByRole("button", { name: `Delete “${kept}”` }).click();
    await expect(page.getByText("No notes yet.")).toBeVisible();
  });

  test("another member can't delete it: 404, and the note is still there", async ({
    playwright,
  }) => {
    const owner = await newMember(playwright, "notes");
    const created = await createNote(owner.request, unique("Not yours"));

    const other = await newMember(playwright, "notes-other");
    const response = await other.request.delete(`${API}/notes/${created.id}`, {
      headers: FROM_APP,
    });
    expect(response.status()).toBe(404);
    expect((await owner.request.get(`${API}/notes/${created.id}`)).status()).toBe(200);
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("signed out, the API answers 401 and the note is still there", async ({ playwright }) => {
    const owner = await newMember(playwright, "notes");
    const created = await createNote(owner.request, unique("Still here"));

    const anyone = await signedOut(playwright);
    const response = await anyone.delete(`${API}/notes/${created.id}`, { headers: FROM_APP });
    expect(response.status()).toBe(401);
    expect((await owner.request.get(`${API}/notes/${created.id}`)).status()).toBe(200);
    await Promise.all([owner.request.dispose(), anyone.dispose()]);
  });

  test("a note that's already deleted answers 404", async ({ playwright }) => {
    const owner = await newMember(playwright, "notes");
    const created = await createNote(owner.request, unique("Twice"));
    const first = await owner.request.delete(`${API}/notes/${created.id}`, { headers: FROM_APP });
    expect(first.status()).toBe(204);
    const again = await owner.request.delete(`${API}/notes/${created.id}`, { headers: FROM_APP });
    expect(again.status()).toBe(404);
    await owner.request.dispose();
  });
});
