"use server";

import {
  claimInput,
  claimVerify,
  eventPatch,
  hostUpdate,
  manualEvent,
  placeConfirm,
} from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApi } from "@/lib/api";
import type { AddEventState } from "@/app/crew/actions";

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);

export type ClaimState = {
  status: "idle" | "error" | "sent" | "verified" | "pending";
  message?: string;
};

async function errorText(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.clone().json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    return message && response.status < 500 ? message : fallback;
  } catch {
    return fallback;
  }
}

export async function startClaim(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const method = String(formData.get("method") ?? "");
  const parsed = claimInput.safeParse({
    host: String(formData.get("host") ?? ""),
    method,
    ...(method === "domain-email" && { email: String(formData.get("email") ?? "").trim() }),
    ...(method === "crew" && { note: String(formData.get("note") ?? "").trim() }),
  });
  if (!parsed.success)
    return { status: "error", message: "Pick your club and fill in the fields." };
  const api = await getApi();
  const { data, response } = await api.POST("/organise/claims", { body: parsed.data });
  if (!data)
    return { status: "error", message: await errorText(response, "Could not start the claim.") };
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
  const parsed = claimVerify.safeParse({ code: String(formData.get("code") ?? "") });
  if (!slug.safeParse(host).success || !parsed.success) {
    return { status: "error", message: "Enter the 6-digit code from the email." };
  }
  const api = await getApi();
  const { data, response } = await api.POST("/organise/claims/{host}/code", {
    params: { path: { host } },
    body: parsed.data,
  });
  if (!data)
    return { status: "error", message: await errorText(response, "That didn't work. Try again.") };
  revalidatePath("/organise");
  return { status: "verified", message: "Verified. Welcome aboard." };
}

export async function checkWebsite(host: string): Promise<ClaimState> {
  if (!slug.safeParse(host).success) return { status: "error" };
  const api = await getApi();
  const { data, response } = await api.POST("/organise/claims/{host}/website", {
    params: { path: { host } },
  });
  if (!data)
    return { status: "error", message: await errorText(response, "We couldn't check it.") };
  revalidatePath("/organise");
  return { status: "verified", message: "Found it. You're verified." };
}

export async function publishEvent(
  host: string,
  _prev: AddEventState,
  formData: FormData,
): Promise<AddEventState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const parsed = manualEvent.safeParse({
    name: text("name"),
    kind: text("kind"),
    discipline: text("discipline"),
    startDate: text("startDate"),
    endDate: text("endDate"),
    ...(text("place") && { place: text("place") }),
    ...(text("placeText") && { placeText: text("placeText") }),
    url: text("url"),
    ...(text("entryFee") && { entryFee: text("entryFee") }),
    ...(text("summary") && { summary: text("summary") }),
    beginnerFriendly: formData.get("beginnerFriendly") === "on",
  });
  if (!slug.safeParse(host).success) return { status: "error" };
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const api = await getApi();
  const { data, response } = await api.POST("/organise/{host}/events", {
    params: { path: { host } },
    body: parsed.data,
  });
  if (!data)
    return { status: "error", message: await errorText(response, "Could not publish it.") };
  revalidatePath(`/organise/${host}`);
  return { status: "done", message: "Published.", slug: data.slug };
}

export async function quickEdit(
  host: string,
  event: string,
  patch: z.input<typeof eventPatch>,
): Promise<void> {
  const parsed = eventPatch.safeParse(patch);
  if (!slug.safeParse(host).success || !slug.safeParse(event).success || !parsed.success) return;
  const api = await getApi();
  await api.PATCH("/organise/{host}/events/{slug}", {
    params: { path: { host, slug: event } },
    body: parsed.data,
  });
  revalidatePath(`/organise/${host}`);
}

export type SimpleState = { status: "idle" | "done" | "error"; message?: string };

export async function saveClub(
  host: string,
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const parsed = hostUpdate.safeParse({
    summary: String(formData.get("summary") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    disciplines: formData.getAll("disciplines").map(String),
    acceptsNewcomers: formData.get("acceptsNewcomers") === "on",
  });
  if (!slug.safeParse(host).success || !parsed.success) {
    return { status: "error", message: "Check the website link." };
  }
  const api = await getApi();
  const { response } = await api.PATCH("/organise/{host}", {
    params: { path: { host } },
    body: parsed.data,
  });
  if (!response.ok) return { status: "error", message: "Could not save." };
  revalidatePath(`/organise/${host}`);
  return { status: "done", message: "Saved." };
}

export async function confirmPlace(host: string, place: string, formData: FormData): Promise<void> {
  const parsed = placeConfirm.safeParse({
    access: String(formData.get("access") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!slug.safeParse(host).success || !slug.safeParse(place).success || !parsed.success) return;
  const api = await getApi();
  await api.POST("/organise/{host}/places/{slug}/confirm", {
    params: { path: { host, slug: place } },
    body: parsed.data,
  });
  revalidatePath(`/organise/${host}`);
}
