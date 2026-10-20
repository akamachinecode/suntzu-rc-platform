"use server";

import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(2000),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof z.infer<typeof contactSchema>, string[]>>;
};

/**
 * Example Server Action. Pattern to follow for every mutation:
 * 1. (When auth exists) check the user is allowed to do this.
 * 2. Validate ALL input with Zod — never trust the browser.
 * 3. Do the work (save to the database, send an email…).
 * 4. Return a serializable state for the form to display.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // TODO: deliver the message (e.g. Amazon SES) — see "Standard choices" in AGENTS.md.
  console.info("Contact form submission", { name: parsed.data.name });

  return { status: "success", message: "Thanks! We'll get back to you soon." };
}
