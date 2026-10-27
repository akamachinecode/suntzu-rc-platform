"use server";

import { tryInput } from "@workspace/shared";
import { z } from "zod";
import { getApi } from "@/lib/api";

export type TryState = {
  status: "idle" | "error" | "done";
  message?: string;
  sentTo?: string[];
  toCrew?: boolean;
  errors?: Partial<Record<string, string[]>>;
};

export async function askToTry(_prev: TryState, formData: FormData): Promise<TryState> {
  const token = formData.get("cf-turnstile-response");
  const parsed = tryInput.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    discipline: String(formData.get("discipline") ?? ""),
    message: String(formData.get("message") ?? "").trim(),
    consent: formData.get("consent") === "on",
    ...(typeof token === "string" && { turnstileToken: token }),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const api = await getApi();
  const { data, response } = await api.POST("/try", { body: parsed.data });
  if (!data) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      status: "error",
      message:
        response.status === 400 && body.message
          ? body.message
          : "We couldn't send it. Try again in a minute.",
    };
  }
  return { status: "done", sentTo: data.sentTo, toCrew: data.toCrew };
}
