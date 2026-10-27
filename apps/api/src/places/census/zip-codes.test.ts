import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unzipEntry } from "./unzip.js";
import { gazetteerUrl, isFloridaZip, readGazetteer } from "./zip-codes.js";

// zcta-sample.zip: the header and six rows of the Census Bureau's 2026 Gazetteer ZCTA file
// (public domain), zipped as the Bureau ships it.
const archive = readFileSync(new URL("./fixtures/zcta-sample.zip", import.meta.url));

describe("the Gazetteer file", () => {
  it("comes out of its ZIP archive", () => {
    const entry = unzipEntry(archive, (name) => name.endsWith(".txt"));
    expect(entry.name).toBe("2026_Gaz_zcta_sample.txt");
    expect(entry.data.toString("utf8")).toMatch(/^GEOID\|GEOIDFQ\|/);
  });

  it("gives Florida's ZIP code centres", () => {
    const { data } = unzipEntry(archive, (name) => name.endsWith(".txt"));
    expect(readGazetteer(data.toString("utf8"))).toEqual({
      rows: [
        { zip: "32003", latitude: 30.09517, longitude: -81.709584, state: "FL" },
        { zip: "33133", latitude: 25.730449, longitude: -80.233615, state: "FL" },
        { zip: "34102", latitude: 26.137498, longitude: -81.799105, state: "FL" },
      ],
      skipped: [],
    });
  });

  it("reads the older tab-separated files too", () => {
    const text =
      "GEOID\tALAND\tAWATER\tALAND_SQMI\tAWATER_SQMI\tINTPTLAT\tINTPTLONG                    \n" +
      "33133\t10780059\t6386890\t4.162\t2.466\t25.730449\t-80.233615\n" +
      "33134\t1\t0\t0\t0\t\t\n";
    expect(readGazetteer(text)).toEqual({
      rows: [{ zip: "33133", latitude: 25.730449, longitude: -80.233615, state: "FL" }],
      skipped: [{ id: "33134", reason: "no position" }],
    });
  });

  it("refuses a file it doesn't recognise", () => {
    expect(() => readGazetteer("ZIP|LAT|LNG\n33133|25.7|-80.2")).toThrow(/Gazetteer header/);
    expect(() => unzipEntry(Buffer.from("not a zip"), () => true)).toThrow(/ZIP/);
  });
});

it("knows Florida's ZIP codes", () => {
  expect(["32003", "33133", "34102", "34997"].every(isFloridaZip)).toBe(true);
  expect(["34001", "31999", "35004", "00601", "3313"].some(isFloridaZip)).toBe(false);
  expect(gazetteerUrl(2026)).toBe(
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_Gaz_zcta_national.zip",
  );
});
