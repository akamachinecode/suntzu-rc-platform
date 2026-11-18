"use server";

import { claimInput, claimVerify } from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApi } from "@/lib/api";
import { apiErrorText } from "@/lib/api-error";
import { typedValues } from "@/lib/typed-values";

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);

export type ClaimState = {
  status: "idle" | "error" | "sent" | "verified" | "pending";
  message?: string;
  /** What was typed, given back after an error so the form keeps it. */
  values?: Partial<Record<string, string>>;
};

export async function startClaim(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const method = String(formData.get("method") ?? "");
  const parsed = claimInput.safeParse({
    host: String(formData.get("host") ?? ""),
    method,
    ...(method === "domain-email" && { email: String(formData.get("email") ?? "").trim() }),
    ...(method === "crew" && { note: String(formData.get("note") ?? "").trim() }),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Pick your club and fill in the fields.",
      values: typedValues(formData),
    };
  }
  const api = await getApi();
  const result = await api.POST("/organise/claims", { body: parsed.data });
  const { data } = result;
  if (!data) {
    return {
      status: "error",
      message: apiErrorText(result, "Could not start the claim."),
      values: typedValues(formData),
    };
  }
  revalidatePath("/organise");
  return {
    status: method === "domain-email" ? "sent" : "pending",
    message:
      method === "domain-email"
        ? "We emailed you a 6-digit code. Enter it below."
        : method === "crew"
          ? "Thanks. The crew will check and get back to you."
          : "Now put the code on your website and press “Check my website”.",
  };
}

export async function enterCode(
  host: string,
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  // "123 456" works too, as on the sign-in screen.
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const parsed = claimVerify.safeParse({ code });
  if (!slug.safeParse(host).success || !parsed.success) {
    return { status: "error", message: "Enter the 6-digit code from the email." };
  }
  const api = await getApi();
  const result = await api.POST("/organise/claims/{host}/code", {
    params: { path: { host } },
    body: parsed.data,
  });
  const { data } = result;
  if (!data)
    return {
      status: "error",
      message: apiErrorText(result, "That didn't work. Try again."),
    };
  revalidatePath("/organise");
  return { status: "verified", message: "Verified. Welcome aboard." };
}

export async function checkWebsite(host: string): Promise<ClaimState> {
  if (!slug.safeParse(host).success) return { status: "error" };
  const api = await getApi();
  const result = await api.POST("/organise/claims/{host}/website", {
    params: { path: { host } },
  });
  const { data } = result;
  if (!data) return { status: "error", message: apiErrorText(result, "We couldn't check it.") };
  revalidatePath("/organise");
  return { status: "verified", message: "Found it. You're verified." };
}
