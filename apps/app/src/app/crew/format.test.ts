import { describe, expect, it } from "vitest";
import { readEvidence, readValue } from "./format";

describe("what the engine understood, in plain words", () => {
  it("reads dates as dates", () => {
    expect(readValue("startDate", "2026-11-22")).toBe("Sun, Nov 22, 2026");
    expect(readValue("endDate", "2027-03-01")).toBe("Mon, Mar 1, 2027");
  });

  it("reads kinds, disciplines, statuses and precision as words", () => {
    expect(readValue("kind", "fly-in")).toBe("Fly-in");
    expect(readValue("discipline", "air")).toBe("Planes and jets");
    expect(readValue("status", "cancelled")).toBe("Cancelled");
    expect(readValue("datePrecision", "month")).toBe("The month only");
  });

  it("shows a link by its site and page, and empty values as a dash", () => {
    expect(readValue("url", "https://www.delandrc.com/jets-over-deland")).toBe(
      "delandrc.com/jets-over-deland",
    );
    expect(readValue("url", "https://example.org/")).toBe("example.org");
    expect(readValue("entryFee", null)).toBe("—");
    expect(readValue("cancelled", true)).toBe("Yes");
  });

  it("keeps anything else as written", () => {
    expect(readValue("name", "Jets Over Miami")).toBe("Jets Over Miami");
    expect(readValue("kind", "air-race")).toBe("air-race");
  });
});

describe("the source's exact words, laid out to read", () => {
  it("turns quoted structured data into one line per value, without @type", () => {
    expect(
      readEvidence(
        '"location":{"@type":"Place","name":"Silver Field","address":{"@type":"PostalAddress","addressLocality":"Miami","addressRegion":"FL"}}',
      ),
    ).toEqual({
      lines: [
        ["location › name", "Silver Field"],
        ["location › address › address locality", "Miami"],
        ["location › address › address region", "FL"],
      ],
    });
  });

  it("reads a single quoted value", () => {
    expect(readEvidence('"startDate":"2026-11-22"')).toEqual({
      lines: [["start date", "2026-11-22"]],
    });
  });

  it("numbers lists of more than one", () => {
    expect(readEvidence('"categories":["Fly-in","Jets"]')).toEqual({
      lines: [
        ["categories › 1", "Fly-in"],
        ["categories › 2", "Jets"],
      ],
    });
  });

  it("leaves calendar lines and plain quotes as written", () => {
    expect(readEvidence("DTSTART;VALUE=DATE:20261122")).toEqual({
      text: "DTSTART;VALUE=DATE:20261122",
    });
    expect(readEvidence("Fly-in at Silver Field, Dec 2-5")).toEqual({
      text: "Fly-in at Silver Field, Dec 2-5",
    });
  });
});
