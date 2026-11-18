import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { createNote, newMember, signedOut } from "./members.ts";
import { signedIn } from "./people.ts";
import { unique } from "./data.ts";

// docs/bits/notes.list.md: a member sees their own notes on /notes, newest first, and nobody else's.
test.describe("notes.list", () => {
  test("a new member sees an empty list", async ({ page }) => {
    await signedIn(page, "notes");
    await page.goto("/notes");
    await expect(page.getByRole("heading", { level: 1, name: "Notes" })).toBeVisible();
    await expect(page.getByText("No notes yet.")).toBeVisible();
  });

  test("a member sees their notes, newest first", async ({ page }) => {
    await signedIn(page, "notes");
    const first = unique("First note");
    const second = unique("Second note");
    await createNote(page.request, first, "Written first.");
    await createNote(page.request, second, "Written second.");

    await page.goto("/notes");
    const notes = page.getByRole("main").getByRole("listitem");
    await expect(notes).toHaveCount(2);
    await expect(notes.nth(0)).toContainText(second);
    await expect(notes.nth(0)).toContainText("Written second.");
    await expect(notes.nth(1)).toContainText(first);
    await expect(page.getByText("No notes yet.")).toHaveCount(0);
  });

  test("a member never sees another member's notes", async ({ page, playwright }) => {
    const other = await newMember(playwright, "notes-other");
    const theirs = unique("Private note of another member");
    await createNote(other.request, theirs);
    await other.request.dispose();

    await signedIn(page, "notes");
    await page.goto("/notes");
    await expect(page.getByText("No notes yet.")).toBeVisible();
    await expect(page.getByText(theirs)).toHaveCount(0);
    const mine = (await (await page.request.get(`${API}/notes`)).json()) as { title: string }[];
    expect(mine).toEqual([]);
  });

  test("signed out, the page asks to sign in and the API answers 401", async ({
    page,
    playwright,
  }) => {
    await page.goto("/notes");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fnotes$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const anyone = await signedOut(playwright);
    expect((await anyone.get(`${API}/notes`)).status()).toBe(401);
    await anyone.dispose();
  });
});
