"use server";

import { noteInput } from "@workspace/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApi } from "@/lib/api";
import { typedValues } from "@/lib/typed-values";

export type NoteFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof z.infer<typeof noteInput>, string[]>>;
  /** What was typed, given back after an error: React 19 resets the form after its action. */
  values?: Partial<Record<string, string>>;
};

/**
 * Pattern for every mutation: validate with the shared schema (fast feedback), then call the API,
 * which validates again and checks the user. Never write to the database from this app.
 */
export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const parsed = noteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted field.",
      errors: z.flattenError(parsed.error).fieldErrors,
      values: typedValues(formData),
    };
  }
  const api = await getApi();
  const { error } = await api.POST("/notes", { body: parsed.data });
  if (error) {
    return {
      status: "error",
      message: "Could not save the note. Try again.",
      values: typedValues(formData),
    };
  }
  revalidatePath("/notes");
  return { status: "success", message: "Note saved." };
}

export async function deleteNote(id: string): Promise<void> {
  const api = await getApi();
  await api.DELETE("/notes/{id}", { params: { path: { id } } });
  revalidatePath("/notes");
}
