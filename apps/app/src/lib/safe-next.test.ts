import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on this site, with their query and hash", () => {
    expect(safeNext("/crew")).toBe("/crew");
    expect(safeNext("/organise?club=west-palm")).toBe("/organise?club=west-palm");
    expect(safeNext("/events/jets#going")).toBe("/events/jets#going");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\\/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
  ])("sends %j to the fallback", (next) => {
    expect(safeNext(next)).toBe("/me");
  });

  it("falls back when next is missing or repeated", () => {
    expect(safeNext(undefined)).toBe("/me");
    expect(safeNext(["/crew", "//evil.com"])).toBe("/me");
    expect(safeNext(undefined, "/crew")).toBe("/crew");
  });
});
