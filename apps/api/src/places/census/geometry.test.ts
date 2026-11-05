import { describe, expect, it } from "vitest";
import {
  boundingBox,
  distanceMeters,
  insideRing,
  ringArea,
  ringCentroid,
  simplifyRing,
  toPolygons,
  type Ring,
} from "./geometry.js";

/** A circle drawn the Esri way (clockwise), like an FAA class D outline. */
function circle(lng: number, lat: number, radiusMeters: number, points: number): Ring {
  const ring: Ring = [];
  for (let i = 0; i < points; i++) {
    const angle = (-2 * Math.PI * i) / points;
    ring.push([
      lng + (radiusMeters * Math.cos(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180)),
      lat + (radiusMeters * Math.sin(angle)) / 110_540,
    ]);
  }
  ring.push(ring[0]!);
  return ring;
}

const square = (x: number, y: number, size: number): Ring => [
  [x, y],
  [x, y + size],
  [x + size, y + size],
  [x + size, y],
  [x, y],
];

describe("distances and centres", () => {
  it("measures metres between two points", () => {
    // Silver Field to Markham Park, about 60 km.
    const meters = distanceMeters(
      { latitude: 25.60495, longitude: -80.51998 },
      { latitude: 26.12643, longitude: -80.34863 },
    );
    expect(meters).toBeGreaterThan(59_000);
    expect(meters).toBeLessThan(62_000);
  });

  it("finds the centre of an area", () => {
    expect(ringCentroid(square(-81, 28, 0.01))).toEqual({ latitude: 28.005, longitude: -80.995 });
  });

  it("finds the bounding box", () => {
    expect(boundingBox([square(-81, 28, 0.5)])).toEqual({
      minLat: 28,
      minLng: -81,
      maxLat: 28.5,
      maxLng: -80.5,
    });
  });
});

describe("toPolygons", () => {
  it("turns Esri rings into GeoJSON polygons, holes after their outer ring", () => {
    const outer = square(-81, 28, 1); // clockwise in Esri terms
    const hole = [...square(-80.75, 28.25, 0.5)].reverse(); // counter-clockwise
    const other = square(-79, 28, 0.5);
    const polygons = toPolygons([outer, hole, other]);
    expect(polygons).toHaveLength(2);
    expect(polygons[0]).toHaveLength(2);
    expect(ringArea(polygons[0]![0]!)).toBeGreaterThan(0); // outer: counter-clockwise
    expect(ringArea(polygons[0]![1]!)).toBeLessThan(0); // hole: clockwise
    expect(insideRing([-80.9, 28.1], polygons[0]![0]!)).toBe(true);
    expect(insideRing([-80.5, 28.5], polygons[0]![1]!)).toBe(true);
  });
});

describe("simplifyRing", () => {
  it("draws a 6,000-point circle with a few dozen points, within the tolerance", () => {
    const ring = circle(-82.22, 29.17, 7_400, 6_000);
    const simple = simplifyRing(ring, 15);
    expect(simple.length).toBeLessThan(150);
    expect(simple.length).toBeGreaterThan(20);
    expect(simple[0]).toEqual(simple[simple.length - 1]);
    // The same shape: the area changes by well under 1 %.
    expect(Math.abs(ringArea(simple) / ringArea(ring) - 1)).toBeLessThan(0.01);
    // Only points of the original outline are kept.
    for (const [x, y] of simple) {
      const closest = Math.min(...ring.map(([ox, oy]) => Math.hypot(ox - x, oy - y)));
      expect(closest).toBeLessThan(1e-5);
    }
  });

  it("keeps small rings as they are", () => {
    expect(simplifyRing(square(-81, 28, 0.001), 15)).toHaveLength(5);
  });
});
