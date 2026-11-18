import { expect, test } from "@playwright/test";

// How forms answer people (spec 0010, slice 3): what was typed stays after an error, the cursor
// goes to the first field with an error, the error is read with its field, the answer is
// announced, and a new step takes the focus.
// Bits (docs/bits/): contact.send, try.request, auth.email-code (the code step) and
// corrections.create (opening the form).

test("contact: an error keeps what was typed and puts the cursor on the field", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.fill("#name", "Ana Pilot");
  await page.fill("#email", "ana@example.com");
  await page.selectOption("#topic", { index: 2 });
  await page.fill("#message", "short");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("status")).toHaveText("Please fix the highlighted fields.");
  await expect(page.locator("#name")).toHaveValue("Ana Pilot");
  await expect(page.locator("#email")).toHaveValue("ana@example.com");
  await expect(page.locator("#topic")).not.toHaveValue("");
  await expect(page.locator("#message")).toHaveValue("short");

  const message = page.locator("#message");
  await expect(message).toBeFocused();
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(message).toHaveAccessibleDescription(/Error: Tell us a bit more/);

  // Typing clears the error until the next send.
  await page.keyboard.type(" and more about what I fly");
  await expect(message).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator("#message-error")).toHaveCount(0);
});

test("try: radio buttons, and the choice survives an error", async ({ page }) => {
  await page.goto("/try");
  await page.fill("#try-name", "Ana");
  await page.getByRole("radio", { name: "Helicopters" }).check();
  await page.getByRole("button", { name: "Find me a club" }).click();

  await expect(page.getByRole("status")).toHaveText("Please fix the highlighted fields.");
  await expect(page.locator("#try-name")).toHaveValue("Ana");
  await expect(page.getByRole("radio", { name: "Helicopters" })).toBeChecked();
  await expect(page.locator("#try-email")).toBeFocused();
});

test("sign-in: the code step takes the focus, and going back returns to the address", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.fill("#email", "a11y-check@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeFocused();
  await expect(page.locator("#code")).toHaveAccessibleDescription(/6-digit code/);

  await page.getByRole("button", { name: "Use another address" }).click();
  await expect(page.locator("#email")).toBeFocused();
  await expect(page.locator("#email")).toHaveValue("a11y-check@example.com");
});

test("an event: opening the correction form puts the cursor in it", async ({ page }) => {
  const response = await fetch(`${process.env.E2E_API_URL ?? "http://localhost:3001"}/events`);
  const [event] = (await response.json()) as { slug: string }[];
  test.skip(!event, "the API lists no events");
  await page.goto(`/events/${event!.slug}`);
  await page.getByRole("button", { name: "Suggest a correction" }).click();
  await expect(page.locator("#fix-start")).toBeFocused();
});
