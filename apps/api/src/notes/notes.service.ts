import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, schema } from "@workspace/db";
import type { Note, NoteInput } from "@workspace/shared";
import { type Database, InjectDb } from "../db/db.module.js";

const { notes } = schema;

// Business rules live in services. Every query is scoped to the owner: a user can never read or
// change another user's notes, and someone else's note answers 404 (not 403) so IDs can't be probed.
@Injectable()
export class NotesService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(ownerId: string): Promise<Note[]> {
    const rows = await this.db
      .select()
      .from(notes)
      .where(eq(notes.ownerId, ownerId))
      .orderBy(desc(notes.createdAt));
    return rows.map(toNote);
  }

  async get(ownerId: string, id: string): Promise<Note> {
    const [row] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
    if (!row) throw new NotFoundException();
    return toNote(row);
  }

  async create(ownerId: string, input: NoteInput): Promise<Note> {
    const [row] = await this.db
      .insert(notes)
      .values({ ...input, ownerId })
      .returning();
    return toNote(row!);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)))
      .returning({ id: notes.id });
    if (!deleted.length) throw new NotFoundException();
  }
}

function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
