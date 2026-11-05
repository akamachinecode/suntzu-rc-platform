"use server";

import { z } from "zod";

const buildSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  model: z.string().trim().min(2, "What did you build or fly?").max(120),
  story: z.string().trim().min(20, "Tell us a bit more (at least 20 characters).").max(3000),
  link: z.union([z.literal(""), z.url("Paste a full link, starting with https://")]),
  consent: z.literal("on", "We need your OK to publish it."),
});

export type BuildState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof z.infer<typeof buildSchema>, string[]>>;
};

/**
 * Community submissions, phase 1: no accounts. The crew reviews each one and publishes it by hand.
 * Phase 2 (member accounts and posts) needs a database and auth — see docs/DECISIONS.md.
 */
export async function submitBuild(_prev: BuildState, formData: FormData): Promise<BuildState> {
  const parsed = buildSchema.safeParse({
    ...Object.fromEntries(formData),
    consent: formData.get("consent") ?? "",
    link: formData.get("link") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // TODO: deliver to the crew (Amazon SES) — same as the contact form.
  console.info("Build submission", { name: parsed.data.name, model: parsed.data.model });

  return {
    status: "success",
    message: "Thanks! We'll read it and get in touch before anything goes live.",
  };
}
