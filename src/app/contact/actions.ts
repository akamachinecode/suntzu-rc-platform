"use server";

import { z } from "zod";
import { TOPICS } from "@/content/services";

const topicValues = TOPICS.map((topic) => topic.value) as [string, ...string[]];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  topic: z.enum(topicValues, "Pick what you'd like help with."),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(2000),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof z.infer<typeof contactSchema>, string[]>>;
};

/**
 * Pattern to follow for every mutation:
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

  // TODO: deliver the message (Amazon SES) — see "Standard choices" in AGENTS.md and docs/DECISIONS.md.
  console.info("Contact form submission", { name: parsed.data.name, topic: parsed.data.topic });

  return { status: "success", message: "Got it. One of us will reply within a couple of days." };
}
