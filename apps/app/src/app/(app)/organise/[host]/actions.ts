"use server";

import { eventPatch, hostUpdate, manualEvent, placeConfirm } from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AddEventState } from "@/app/(app)/crew/actions";
import { getApi } from "@/lib/api";
import { apiErrorText } from "@/lib/api-error";
import { typedValues } from "@/lib/typed-values";

// An organiser's own club page (/organise/<host>): their events, the club's details and its places.
// The API checks that the signed-in member organises this club on every call.

const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);

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
      values: typedValues(formData),
    };
  }
  const api = await getApi();
  const { data, response } = await api.POST("/organise/{host}/events", {
    params: { path: { host } },
    body: parsed.data,
  });
  if (!data) {
    return {
      status: "error",
      message: await apiErrorText(response, "Could not publish it."),
      values: typedValues(formData),
    };
  }
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
