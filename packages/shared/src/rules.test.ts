import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { messageInput } from "./community.js";
import { manualEvent } from "./crew.js";
import { DISCIPLINES, EVENT_KINDS } from "./events.js";
import { claimVerify } from "./organise.js";

// Property tests (fast-check) for rules the API and the app both trust: hundreds of generated inputs
// each, so a rule holds for any input, not just the examples someone thought of.

const day = fc
  .date({ noInvalidDate: true, min: new Date("2020-01-01"), max: new Date("2035-12-31") })
  .map((date) => date.toISOString().slice(0, 10));

const anyEvent = fc.record({
  name: fc.string({ minLength: 3, maxLength: 160 }),
  kind: fc.constantFrom(...EVENT_KINDS),
  discipline: fc.constantFrom(...DISCIPLINES),
  startDate: day,
  endDate: fc.option(day, { nil: undefined }),
});

describe("manualEvent", () => {
  it("never accepts an event whose last day is before its first", () => {
    fc.assert(
      fc.property(anyEvent, (input) => {
        const parsed = manualEvent.safeParse(input);
        if (parsed.success && parsed.data.endDate) {
          expect(parsed.data.endDate >= parsed.data.startDate).toBe(true);
        }
      }),
    );
  });

  it("is idempotent: validating its own output changes nothing", () => {
    fc.assert(
      fc.property(anyEvent, (input) => {
        const once = manualEvent.safeParse(input);
        if (!once.success) return;
        expect(manualEvent.parse(once.data)).toEqual(once.data);
      }),
    );
  });
});

describe("links people type", () => {
  // Every link a visitor or member can type is http(s) only (docs/DECISIONS.md, 2026-11-17): no
  // javascript:, data: or file: link can reach a page, whatever its case or spacing.
  const scheme = fc.constantFrom("javascript", "JavaScript", "data", "file", "vbscript", "ftp");
  const message = (link: string) => ({
    kind: "contact",
    name: "Ana",
    email: "ana@example.test",
    body: "A message long enough to pass.",
    link,
  });

  it("refuses any scheme other than http and https", () => {
    fc.assert(
      fc.property(scheme, fc.string({ maxLength: 40 }), (name, rest) => {
        expect(messageInput.safeParse(message(`${name}:${rest}`)).success).toBe(false);
      }),
    );
  });

  it("accepts http and https links to any host", () => {
    fc.assert(
      fc.property(fc.constantFrom("http", "https"), fc.domain(), (name, host) => {
        expect(messageInput.safeParse(message(`${name}://${host}/`)).success).toBe(true);
      }),
    );
  });
});

describe("claimVerify", () => {
  it("accepts exactly six digits, with spaces around them", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{6}$/), fc.constantFrom("", " ", "  "), (code, pad) => {
        expect(claimVerify.safeParse({ code: `${pad}${code}${pad}` }).success).toBe(true);
      }),
    );
  });

  it("refuses anything that isn't six digits", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 12 }).filter((value) => !/^\s*\d{6}\s*$/.test(value)),
        (code) => {
          expect(claimVerify.safeParse({ code }).success).toBe(false);
        },
      ),
    );
  });
});
