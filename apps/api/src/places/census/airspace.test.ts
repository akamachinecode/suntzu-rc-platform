import { describe, expect, it } from "vitest";
import { airspaceQuery, readAirspace } from "./airspace.js";
import type { RawFeature } from "./arcgis.js";
import { ringArea, type Ring } from "./geometry.js";

/** A clockwise circle, the way the FAA's layer draws a class D area. */
function circle(lng: number, lat: number, radiusMeters: number, points: number): Ring {
  const ring: Ring = [];
  for (let i = 0; i < points; i++) {
    const angle = (-2 * Math.PI * i) / points;
    ring.push([
      lng + (radiusMeters * Math.cos(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180)),
      lat + (radiusMeters * Math.sin(angle)) / 110_540,
    ]);
  }
  return [...ring, ring[0]!];
}

// Attributes as the FAA's Class_Airspace layer has them (2026-10-27); outlines drawn here.
const feature = (attributes: Record<string, unknown>, rings: Ring[]): RawFeature => ({
  attributes: {
    GLOBAL_ID: "{9E1F6FEF-5E4F-48D3-92D7-464A3D6095C8}",
    LOWER_CODE: "SFC",
    SECTOR: null,
    LOCAL_TYPE: `CLASS_${attributes.CLASS}`,
    ...attributes,
  },
  geometry: { rings },
});
const ocala = circle(-82.22, 29.17, 7_400, 6_285);

describe("readAirspace", () => {
  it("keeps a class D area that reaches the ground, simplified, with its bounding box", () => {
    const outcome = readAirspace(
      feature({ NAME: "OCALA CLASS D", CLASS: "D", LOWER_VAL: 0 }, [ocala]),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const [area] = outcome.value;
    expect(area).toMatchObject({
      id: "9e1f6fef-5e4f-48d3-92d7-464a3d6095c8",
      name: "Ocala Class D",
      class: "D",
      lowerFt: 0,
    });
    expect(area!.rings).toHaveLength(1);
    expect(area!.rings[0]!.length).toBeLessThan(150);
    expect(ringArea(area!.rings[0]!)).toBeGreaterThan(0); // counter-clockwise, as GeoJSON asks
    expect(area!.minLat).toBeCloseTo(29.103, 2);
    expect(area!.maxLng).toBeCloseTo(-82.144, 2);
  });

  it("keeps class B shelves with their floor, named by sector", () => {
    const outcome = readAirspace(
      feature(
        { NAME: "MIAMI CLASS B", CLASS: "B", LOWER_VAL: 1500, LOWER_CODE: "MSL", SECTOR: "AREA B" },
        [circle(-80.29, 25.79, 15_000, 400)],
      ),
    );
    expect(outcome.ok && outcome.value[0]).toMatchObject({
      name: "Miami Class B (Area B)",
      class: "B",
      lowerFt: 1500,
    });
  });

  it("skips airspace that starts above the ground", () => {
    expect(
      readAirspace(
        feature({ NAME: "OCALA CLASS E5", CLASS: "E", LOCAL_TYPE: "CLASS_E5", LOWER_VAL: 700 }, [
          ocala,
        ]),
      ),
    ).toMatchObject({ ok: false, reason: "doesn't reach the ground" });
    expect(
      readAirspace(feature({ NAME: "FORT MYERS CLASS C", CLASS: "C", LOWER_VAL: 1200 }, [ocala])),
    ).toMatchObject({ ok: false });
  });

  it("splits a feature with two separate areas into two rows", () => {
    const outcome = readAirspace(
      feature({ NAME: "NAPLES CLASS E4", CLASS: "E", LOCAL_TYPE: "CLASS_E4", LOWER_VAL: 0 }, [
        circle(-81.77, 26.15, 2_000, 200),
        circle(-81.6, 26.15, 2_000, 200),
      ]),
    );
    expect(outcome.ok && outcome.value.map((area) => area.id)).toEqual([
      "9e1f6fef-5e4f-48d3-92d7-464a3d6095c8",
      "9e1f6fef-5e4f-48d3-92d7-464a3d6095c8-2",
    ]);
  });

  it("asks the FAA only for what reaches the ground, plus class B", () => {
    expect(airspaceQuery.where).toContain("CLASS='B'");
    expect(airspaceQuery.where).toContain("LOWER_VAL=0");
  });
});
