import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { getApi } from "@/lib/api";
import { deleteNote } from "./actions";
import { NoteForm } from "./note-form";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Notes",
  description: "Example of a private page backed by the API.",
};

// Example private page: data comes from apps/api through the typed client.
export default async function NotesPage() {
  const api = await getApi();
  const { data: notes, response } = await api.GET("/notes");
  if (response.status === 401) redirect("/sign-in?next=/notes");
  if (!notes) throw new Error(`The API answered ${response.status}`);

  return (
    <section className="mx-auto grid max-w-2xl gap-8 px-5 py-16 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 font-heading text-4xl font-semibold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">
            Example of a private page: only you can see your notes.
          </p>
        </div>
        <SignOutButton />
      </div>
      <NoteForm />
      <ul className="grid gap-4">
        {notes.map((note) => (
          <li key={note.id}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="grid gap-1">
                  <CardTitle>{note.title}</CardTitle>
                  {note.body && <CardDescription>{note.body}</CardDescription>}
                </div>
                <form action={deleteNote.bind(null, note.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      {notes.length === 0 && <p className="text-muted-foreground">No notes yet.</p>}
    </section>
  );
}
