"use server";

import { crewDecision, eventPatch, manualEvent } from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApi } from "@/lib/api";

// The crew's decisions. The API checks the crew role on every call; these only shape the input.

export async function decide(id: string, action: "approve" | "reject"): Promise<void> {
  const parsed = crewDecision.safeParse({ action });
  if (!parsed.success || !z.uuid().safeParse(id).success) return;
  const api = await getApi();
  await api.POST("/crew/reviews/{id}/decision", { params: { path: { id } }, body: parsed.data });
  revalidatePath("/crew");
}

export type CorrectState = { status: "idle" | "error" | "done"; message?: string };

export async function correct(
  id: string,
  _prev: CorrectState,
  formData: FormData,
): Promise<CorrectState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const patch = eventPatch.safeParse({
    ...(text("startDate") && {
      startDate: text("startDate"),
      datePrecision: "day",
      dateText: null,
    }),
    ...(text("startDate") && { endDate: text("endDate") || null }),
    ...(text("status") && { status: text("status") }),
    ...(text("name") && { name: text("name") }),
    ...(text("url") && { url: text("url") }),
  });
  if (!patch.success) return { status: "error", message: "Check the dates and the link." };
  const api = await getApi();
  const { error } = await api.POST("/crew/reviews/{id}/decision", {
    params: { path: { id } },
    body: { action: "correct", patch: patch.data },
  });
  if (error) return { status: "error", message: "Could not save the correction." };
  revalidatePath("/crew");
  return { status: "done" };
}

export async function handleMessage(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const api = await getApi();
  await api.POST("/crew/messages/{id}/handled", { params: { path: { id } } });
  revalidatePath("/crew");
}

export async function seeFeedback(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const api = await getApi();
  await api.POST("/crew/feedback/{id}/seen", { params: { path: { id } } });
  revalidatePath("/crew");
}

export type AddEventState = {
  status: "idle" | "error" | "done";
  message?: string;
  slug?: string;
  errors?: Partial<Record<string, string[]>>;
};

export async function addEvent(_prev: AddEventState, formData: FormData): Promise<AddEventState> {
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
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const api = await getApi();
  const { data, error } = await api.POST("/crew/events", { body: parsed.data });
  if (error || !data) return { status: "error", message: "Could not add the event." };
  revalidatePath("/crew");
  return { status: "done", message: "Published.", slug: data.slug };
}
