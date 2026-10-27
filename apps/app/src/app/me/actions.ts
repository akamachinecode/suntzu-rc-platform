"use server";

import { followKey, type FollowKey, memberUpdate } from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getApi } from "@/lib/api";

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<string, string[]>>;
};

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = memberUpdate.safeParse({
    name: String(formData.get("name") ?? ""),
    zip: String(formData.get("zip") ?? "").trim(),
    radiusMiles: Number(formData.get("radiusMiles") ?? 60),
    disciplines: formData.getAll("disciplines").map(String),
    weeklyDigest: formData.get("weeklyDigest") === "on",
    changeAlerts: formData.get("changeAlerts") === "on",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const api = await getApi();
  const { error } = await api.PATCH("/me", { body: parsed.data });
  if (error) return { status: "error", message: "Could not save. Try again." };
  revalidatePath("/me");
  return { status: "success", message: "Saved." };
}

export async function unfollow(key: FollowKey): Promise<void> {
  const parsed = followKey.safeParse(key);
  if (!parsed.success) return;
  const api = await getApi();
  await api.DELETE("/me/follows/{target}/{id}", { params: { path: parsed.data } });
  revalidatePath("/me");
}

export async function deleteAccount(formData: FormData): Promise<void> {
  if (formData.get("confirm") !== "delete") return;
  const api = await getApi();
  await api.DELETE("/me");
  redirect("/?account=deleted");
}
