import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { note, noteInput } from "./notes.js";

// Property tests (fast-check): rules that must hold for any input, checked against hundreds of
// generated ones. The API and the app both trust these schemas, so they're worth proving.
const anyInput = fc.record({
  title: fc.string({ maxLength: 200 }),
  body: fc.option(fc.string({ maxLength: 6000 }), { nil: undefined }),
});

describe("noteInput", () => {
  it("is idempotent: validating its own output changes nothing", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const once = noteInput.safeParse(input);
        if (!once.success) return;
        expect(noteInput.parse(once.data)).toEqual(once.data);
      }),
    );
  });

  it("never accepts an empty or blank title", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (title) => {
        expect(noteInput.safeParse({ title }).success).toBe(false);
      }),
    );
  });

  it("never lets a title over 120 characters through", () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const parsed = noteInput.safeParse(input);
        if (parsed.success) expect(parsed.data.title.length).toBeLessThanOrEqual(120);
      }),
    );
  });
});

describe("note", () => {
  it("survives a round trip through JSON (what the API sends)", () => {
    const anyNote = fc.record({
      id: fc.uuid(),
      title: fc.string(),
      body: fc.string(),
      createdAt: fc
        .date({ noInvalidDate: true, min: new Date(0), max: new Date("9999-12-31") })
        .map((d) => d.toISOString()),
      updatedAt: fc
        .date({ noInvalidDate: true, min: new Date(0), max: new Date("9999-12-31") })
        .map((d) => d.toISOString()),
    });
    fc.assert(
      fc.property(anyNote, (value) => {
        expect(note.parse(JSON.parse(JSON.stringify(note.parse(value))))).toEqual(value);
      }),
    );
  });
});
