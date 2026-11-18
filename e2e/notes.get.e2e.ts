import { expect, test } from "@playwright/test";
import { API } from "./env.ts";
import { createNote, newMember, signedOut } from "./members.ts";
import { unique } from "./data.ts";

// docs/bits/notes.get.md: the API returns one note to its owner only. Nobody reads someone else's
// note by changing the ID: it answers 404, not 403, so IDs can't be probed. No screen uses it yet.
test.describe("notes.get", () => {
  test("the owner gets their note", async ({ playwright }) => {
    const owner = await newMember(playwright, "notes");
    const title = unique("Mine");
    const created = await createNote(owner.request, title, "Only for me.");

    const response = await owner.request.get(`${API}/notes/${created.id}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: created.id, title, body: "Only for me." });
    await owner.request.dispose();
  });

  test("another member gets 404 for it, not the note", async ({ playwright }) => {
    const owner = await newMember(playwright, "notes");
    const title = unique("Owner only");
    const created = await createNote(owner.request, title);

    const other = await newMember(playwright, "notes-other");
    const response = await other.request.get(`${API}/notes/${created.id}`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(title);
    // The same answer as for a note that doesn't exist at all.
    const unknown = await other.request.get(`${API}/notes/00000000-0000-4000-8000-000000000000`);
    expect(unknown.status()).toBe(404);
    await Promise.all([owner.request.dispose(), other.request.dispose()]);
  });

  test("signed out, the API answers 401", async ({ playwright }) => {
    const owner = await newMember(playwright, "notes");
    const created = await createNote(owner.request, unique("Not for visitors"));

    const anyone = await signedOut(playwright);
    const response = await anyone.get(`${API}/notes/${created.id}`);
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("Not for visitors");
    await Promise.all([owner.request.dispose(), anyone.dispose()]);
  });

  test("an ID that isn't a UUID answers 400", async ({ playwright }) => {
    const member = await newMember(playwright, "notes");
    expect((await member.request.get(`${API}/notes/1`)).status()).toBe(400);
    await member.request.dispose();
  });
});
