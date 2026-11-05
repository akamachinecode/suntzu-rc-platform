"use server";

import { z } from "zod";
import { TOPICS } from "@workspace/shared";
import { getApi } from "@/lib/api";

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
 * 1. Check the user is allowed to do this (public here: Turnstile proves a person sent it).
 * 2. Validate ALL input with Zod — never trust the browser.
 * 3. Do the work through the API.
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

  // The crew's inbox (and an email to CREW_INBOX): see docs/bits/messages.create.md.
  const api = await getApi();
  const token = formData.get("cf-turnstile-response");
  const { error } = await api.POST("/messages", {
    body: {
      kind: "contact",
      topic: parsed.data.topic,
      name: parsed.data.name,
      email: parsed.data.email,
      body: parsed.data.message,
      ...(typeof token === "string" && { turnstileToken: token }),
    },
  });
  if (error) {
    return { status: "error", message: "We couldn't send it. Try again in a minute." };
  }

  return { status: "success", message: "Got it. One of us will reply within a couple of days." };
}
