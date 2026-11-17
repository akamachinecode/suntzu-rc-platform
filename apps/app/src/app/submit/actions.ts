"use server";

import { submissionInput, type SubmissionResult } from "@workspace/shared";
import { z } from "zod";
import { getApi } from "@/lib/api";
import { typedValues } from "@/lib/typed-values";

export type SubmitState = {
  status: "idle" | "error" | "signed-out" | "done";
  message?: string;
  result?: SubmissionResult;
  errors?: Partial<Record<string, string[]>>;
  /** What was typed, given back after an error so the form keeps it. */
  values?: Partial<Record<string, string>>;
};

export async function sendEvent(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const parsed = submissionInput.safeParse({
    url: String(formData.get("url") ?? "").trim(),
    text: String(formData.get("text") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Paste a link or the event's text.",
      errors: z.flattenError(parsed.error).fieldErrors,
      values: typedValues(formData),
    };
  }
  const api = await getApi();
  const { data, response } = await api.POST("/submissions", { body: parsed.data });
  if (response.status === 401) return { status: "signed-out" };
  if (!data) {
    return {
      status: "error",
      message: "We couldn't send it. Try again in a minute.",
      values: typedValues(formData),
    };
  }
  return { status: "done", result: data };
}
