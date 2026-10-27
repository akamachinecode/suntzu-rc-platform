"use server";

import { correctionInput, feedbackInput } from "@workspace/shared";
import { z } from "zod";
import { getApi } from "@/lib/api";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,120}$/);

export async function sendFeedback(
  slug: string,
  right: boolean,
  note: string,
  turnstileToken?: string,
): Promise<"sent" | "error"> {
  const input = feedbackInput.safeParse({ right, note, turnstileToken });
  if (!slugSchema.safeParse(slug).success || !input.success) return "error";
  const api = await getApi();
  const { error } = await api.POST("/events/{slug}/feedback", {
    params: { path: { slug } },
    body: input.data,
  });
  return error ? "error" : "sent";
}

export type CorrectionState = {
  status: "idle" | "sent" | "error" | "signed-out";
  message?: string;
  errors?: Partial<Record<string, string[]>>;
};

export async function suggestCorrection(
  slug: string,
  _prev: CorrectionState,
  formData: FormData,
): Promise<CorrectionState> {
  if (!slugSchema.safeParse(slug).success) return { status: "error" };
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const parsed = correctionInput.safeParse({
    startDate: text("startDate"),
    endDate: text("endDate"),
    cancelled: formData.get("cancelled") === "on",
    url: text("url"),
    note: text("note"),
    sourceUrl: text("sourceUrl"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const api = await getApi();
  const { response } = await api.POST("/events/{slug}/corrections", {
    params: { path: { slug } },
    body: parsed.data,
  });
  if (response.status === 401) return { status: "signed-out" };
  if (!response.ok) return { status: "error", message: "Could not send it. Try again." };
  return { status: "sent", message: "Thanks! The crew will check it against the source." };
}
