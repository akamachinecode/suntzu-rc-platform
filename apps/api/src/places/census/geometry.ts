// Small geometry helpers for the census: centroids, distances, bounding boxes and polygon
// simplification. Coordinates are [lng, lat] in degrees (WGS 84), as in GeoJSON.

export type Position = [number, number];
export type Ring = Position[];
/** One polygon: the outer ring first, then its holes. */
export type Polygon = Ring[];

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rounds to 6 decimals (about 10 cm), enough for any map. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Signed area in square degrees: positive when the ring runs counter-clockwise. */
export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** The centre of mass of a ring; the average of its points if it has no area. */
export function ringCentroid(ring: Ring): LatLng {
  const area = ringArea(ring);
  if (Math.abs(area) < 1e-14) {
    const points = ring.length > 1 ? ring.slice(0, -1) : ring;
    const lng = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const lat = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    return { latitude: round6(lat), longitude: round6(lng) };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    const cross = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  return { latitude: round6(cy / (6 * area)), longitude: round6(cx / (6 * area)) };
}

/** The centre of the largest ring of a shape (a FRIA is one area; a stray sliver doesn't count). */
export function shapeCentroid(rings: Ring[]): LatLng | undefined {
  const largest = [...rings]
    .filter((ring) => ring.length >= 4)
    .sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0];
  return largest && ringCentroid(largest);
}

export function boundingBox(rings: Ring[]): BoundingBox {
  const box = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      box.minLat = Math.min(box.minLat, lat);
      box.maxLat = Math.max(box.maxLat, lat);
      box.minLng = Math.min(box.minLng, lng);
      box.maxLng = Math.max(box.maxLng, lng);
    }
  }
  return box;
}

/** Even-odd test: is the point inside the ring? */
export function insideRing([x, y]: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Esri rings → GeoJSON-style polygons. Esri draws outer rings clockwise and holes
 * counter-clockwise, and one feature may hold several outer rings; each becomes its own polygon,
 * outer ring counter-clockwise with its holes (clockwise) after it, as RFC 7946 asks.
 */
export function toPolygons(rings: Ring[]): Polygon[] {
  const closed = rings.filter((ring) => ring.length >= 4).map(closeRing);
  const outers = closed.filter((ring) => ringArea(ring) < 0);
  const holes = closed.filter((ring) => ringArea(ring) > 0);
  // A ring drawn the "wrong" way with no outer ring around it is an outer ring after all.
  if (!outers.length) return closed.map((ring) => [counterClockwise(ring)]);
  const polygons: Polygon[] = outers.map((outer) => [counterClockwise(outer)]);
  for (const hole of holes) {
    const owner = polygons.find((polygon) => insideRing(hole[0]!, polygon[0]!));
    if (owner) owner.push(clockwise(hole));
    else polygons.push([counterClockwise(hole)]);
  }
  return polygons;
}

function closeRing(ring: Ring): Ring {
  const [first, last] = [ring[0]!, ring[ring.length - 1]!];
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

const counterClockwise = (ring: Ring): Ring => (ringArea(ring) < 0 ? [...ring].reverse() : ring);
const clockwise = (ring: Ring): Ring => (ringArea(ring) > 0 ? [...ring].reverse() : ring);

/**
 * Douglas–Peucker simplification of a closed ring: drops points that move the outline by less
 * than `toleranceMeters`. FAA airspace circles come with thousands of points; a few dozen draw
 * the same shape within metres. Returns a closed ring of at least four points, rounded to 6
 * decimals.
 */
export function simplifyRing(ring: Ring, toleranceMeters: number): Ring {
  const closed = closeRing(ring);
  if (closed.length <= 5) return closed.map(([x, y]) => [round6(x), round6(y)]);
  // Project to metres around the ring's latitude (accurate enough over a few miles).
  const lat0 = toRadians(closed.reduce((sum, [, y]) => sum + y, 0) / closed.length);
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  const points = closed.map(([x, y]) => [x * mPerDegLng, y * mPerDegLat] as const);

  const keep = new Uint8Array(closed.length);
  const last = closed.length - 1;
  // Split the ring at its first point and the point farthest from it, then simplify both halves.
  let far = 1;
  let farDistance = -1;
  for (let i = 1; i < last; i++) {
    const d = Math.hypot(points[i]![0] - points[0]![0], points[i]![1] - points[0]![1]);
    if (d > farDistance) [far, farDistance] = [i, d];
  }
  keep[0] = keep[far] = keep[last] = 1;
  const stack: [number, number][] = [
    [0, far],
    [far, last],
  ];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let index = -1;
    let max = toleranceMeters;
    for (let i = start + 1; i < end; i++) {
      const d = segmentDistance(points[i]!, points[start]!, points[end]!);
      if (d > max) [index, max] = [i, d];
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  const simplified = closed
    .filter((_, i) => keep[i])
    .map(([x, y]): Position => [round6(x), round6(y)]);
  return simplified.length >= 4 ? simplified : closed.map(([x, y]) => [round6(x), round6(y)]);
}

function segmentDistance(
  [px, py]: readonly [number, number],
  [ax, ay]: readonly [number, number],
  [bx, by]: readonly [number, number],
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
