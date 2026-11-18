"use server";

import { tryInput } from "@workspace/shared";
import { z } from "zod";
import { getApi } from "@/lib/api";
import { apiErrorText } from "@/lib/api-error";
import { typedValues } from "@/lib/typed-values";

export type TryState = {
  status: "idle" | "error" | "done";
  message?: string;
  sentTo?: string[];
  toCrew?: boolean;
  errors?: Partial<Record<string, string[]>>;
  /** What was typed, given back after an error so the form keeps it. */
  values?: Partial<Record<string, string>>;
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
      values: typedValues(formData),
    };
  }
  const api = await getApi();
  const result = await api.POST("/try", { body: parsed.data });
  const { data } = result;
  if (!data) {
    // The API's reason when it refused what was typed ("Is it in Florida?"), else a generic one.
    const fallback = "We couldn't send it. Try again in a minute.";
    return {
      status: "error",
      message: result.response.status === 400 ? apiErrorText(result, fallback) : fallback,
      values: typedValues(formData),
    };
  }
  return { status: "done", sentTo: data.sentTo, toCrew: data.toCrew };
}
