import { describe, expect, it } from "vitest";
import { type Gazetteer, looksPersonal, normalise, parseQuery, synonymsOf } from "./query.js";

const at = (latitude: number, longitude: number) => ({ latitude, longitude });
const TOWNS: Record<string, { label: string; point: ReturnType<typeof at> }> = {
  tampa: { label: "Tampa", point: at(27.95, -82.46) },
  miami: { label: "Miami", point: at(25.76, -80.19) },
  hialeah: { label: "Hialeah", point: at(25.86, -80.28) },
  "coral springs": { label: "Coral Springs", point: at(26.27, -80.27) },
  "st petersburg": { label: "St. Petersburg", point: at(27.77, -82.64) },
};
const gazetteer: Gazetteer = {
  zip: (code) => (code === "33441" ? at(26.31, -80.1) : undefined),
  town: (name) => TOWNS[name],
};

describe("normalise", () => {
  it("drops accents, case and punctuation", () => {
    expect(normalise("  Helicóptero, ¡Ya!  ")).toBe("helicoptero ya");
  });

  it("reads R/C, 1/8 and fly-in the way the database does", () => {
    expect(normalise("Ormond Beach R/C Club")).toBe("ormond beach rc club");
    expect(normalise("R.C. field")).toBe("rc field");
    expect(normalise("1/8 scale")).toBe("8th scale");
    expect(normalise("Fly-In")).toBe("flyin");
    expect(normalise("fly in")).toBe("flyin");
    // "fly in" inside a question is two words.
    expect(normalise("can I fly in Miami")).toBe("can i fly in miami");
  });
});

describe("parseQuery", () => {
  it("keeps the words that matter", () => {
    expect(parseQuery("do I need to register my plane", gazetteer)).toMatchObject({
      words: ["register", "plane"],
      type: null,
      near: null,
    });
  });

  it("reads a ZIP code as a place", () => {
    const parsed = parseQuery("33441", gazetteer);
    expect(parsed.near?.label).toBe("33441");
    expect(parsed.words).toEqual([]);
  });

  it("reads a town when it's the whole search or follows near", () => {
    expect(parseQuery("Tampa", gazetteer).near?.label).toBe("Tampa");
    expect(parseQuery("rc field near tampa", gazetteer)).toMatchObject({
      near: { label: "Tampa" },
      type: "place",
      words: ["field", "tampa"],
    });
    expect(parseQuery("events near Miami", gazetteer)).toMatchObject({
      type: "event",
      near: { label: "Miami" },
    });
  });

  it("doesn't read a town inside a name", () => {
    expect(parseQuery("jets over miami", gazetteer).near).toBeNull();
    expect(parseQuery("coral springs rc track", gazetteer).near).toBeNull();
  });

  it("understands common Spanish words", () => {
    expect(parseQuery("pista de carros cerca de Hialeah", gazetteer)).toMatchObject({
      words: ["track", "cars", "hialeah"],
      type: "place",
      near: { label: "Hialeah" },
    });
    expect(parseQuery("eventos de helicóptero", gazetteer)).toMatchObject({
      words: ["helicopter"],
      type: "event",
    });
  });

  it("pins the answer to some questions", () => {
    expect(parseQuery("flying lessons", gazetteer).pinned).toEqual(["service:lessons"]);
    expect(parseQuery("How high can I fly?", gazetteer).pinned).toEqual(["rule:altitude"]);
    expect(parseQuery("clases de vuelo", gazetteer).pinned).toEqual(["service:lessons"]);
    expect(parseQuery("aerofest", gazetteer).pinned).toEqual([]);
  });
});

describe("synonymsOf", () => {
  it("finds the group a word belongs to", () => {
    expect(synonymsOf("heli")).toContain("helicopter");
    expect(synonymsOf("raceway")).toContain("track");
    expect(synonymsOf("aerofest")).toEqual(["aerofest"]);
  });
});

describe("looksPersonal", () => {
  it("catches emails, phone numbers and street addresses", () => {
    expect(looksPersonal("pilot@example.com")).toBe(true);
    expect(looksPersonal("call (954) 555-0134")).toBe(true);
    expect(looksPersonal("+1 305 555 0199")).toBe(true);
    expect(looksPersonal("1200 NW 42nd Ave")).toBe(true);
    expect(looksPersonal("field at 5500 Old Cutler Rd.")).toBe(true);
  });

  it("lets the hobby's numbers through", () => {
    for (const q of ["33441", "1/8 scale", "400 ft", "jets over miami 2026", "1/10 buggy track"]) {
      expect(looksPersonal(q)).toBe(false);
    }
  });
});
