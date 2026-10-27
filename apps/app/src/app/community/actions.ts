"use server";

import { z } from "zod";
import { getApi } from "@/lib/api";

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
 * Builds reach the crew's inbox (docs/bits/community.share-build.md). The crew picks favourites
 * and checks with the person before anything goes live.
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

  const api = await getApi();
  const token = formData.get("cf-turnstile-response");
  const { error } = await api.POST("/messages", {
    body: {
      kind: "build",
      topic: parsed.data.model,
      name: parsed.data.name,
      email: parsed.data.email,
      body: parsed.data.story,
      link: parsed.data.link,
      ...(typeof token === "string" && { turnstileToken: token }),
    },
  });
  if (error) {
    return { status: "error", message: "We couldn't send it. Try again in a minute." };
  }

  return {
    status: "success",
    message: "Thanks! We'll read it and get in touch before anything goes live.",
  };
}
