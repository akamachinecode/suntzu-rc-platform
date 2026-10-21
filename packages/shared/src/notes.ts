import { z } from "zod";

// Request and response shapes of the notes API. The API validates requests with them and
// documents them in OpenAPI; the apps reuse them to validate forms before calling the API.

export const noteInput = z.object({
  title: z.string().trim().min(1, "Give the note a title").max(120),
  body: z.string().trim().max(5000).default(""),
});

export const note = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type NoteInput = z.output<typeof noteInput>;
export type Note = z.output<typeof note>;
