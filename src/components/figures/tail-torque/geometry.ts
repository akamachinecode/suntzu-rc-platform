import {
  corners,
  cylinder,
  extrude,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  segment,
  slabOf,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
} from "@/components/iso/iso-kit";
import { STOP_DEG } from "./model";
import { BASE, BASE_H, FOOT_H, P, SCALE_R, TABLE, at } from "./view";

const RAD = Math.PI / 180;
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");

/** A point on the floor at `deg` round the shaft (0 = nose, +x) and radius `r`. */
const polar = (deg: number, r: number): Plane => [r * Math.cos(deg * RAD), r * Math.sin(deg * RAD)];

const LABEL: Plan = { x: BASE.x + BASE.w - 52, y: BASE.y + BASE.d - 16, w: 40, d: 9, r: 1.5 };
const SPAN = STOP_DEG + 3;

/** The scale strip under the tail: a band round the shaft either side of straight back. */
function band(r0: number, r1: number) {
  const points: Plane[] = [];
  for (let d = -SPAN; d <= SPAN; d += 1.5) points.push(polar(180 + d, r1));
  for (let d = SPAN; d >= -SPAN; d -= 1.5) points.push(polar(180 + d, r0));
  return points;
}

function ticks() {
  const minor: string[] = [];
  const major: string[] = [];
  let zero = "";
  for (let d = -STOP_DEG; d <= STOP_DEG; d += 2) {
    const big = d % 4 === 0;
    // Each tick hangs from the strip's outer edge.
    const outer = polar(180 + d, SCALE_R + 6);
    // Major ticks and the zero cross the whole strip; minor ones hang halfway.
    const inner = polar(180 + d, big ? SCALE_R - 4 : SCALE_R + 6 - 2.6);
    const tick = segment([...outer, 1.2], [...inner, 1.2], P);
    if (d === 0) zero = tick;
    else (big ? major : minor).push(tick);
  }
  return { minor: join(minor), major: join(major), zero };
}
const TICKS = ticks();

export const BENCH = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 14).map(([x, y]) => cylinder(x, y, 5.5, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  base: slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4),
  groove: planOutline(insetPlan(BASE, 4.5), 0, P),
  screwRings: join(corners(BASE, 8).map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: dots(corners(BASE, 8).map(([x, y]) => [x, y, 0])),
  label: slabOf(LABEL, 0, 0.8, P, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [LABEL.x + 4, LABEL.y + 2.6 + row * 2],
          [LABEL.x + (row === 1 ? 20 : 30), LABEL.y + 2.6 + row * 2],
        ],
        0.8,
        P,
      ),
    ),
  ),
  scale: extrude(band(SCALE_R - 4, SCALE_R + 6), 0, 1.2, P, { convex: false }),
  minor: TICKS.minor,
  major: TICKS.major,
  zero: TICKS.zero,
  ring: cylinder(0, 0, TABLE.r, 0, TABLE.ring, P, 56, 0.6),
  ringTicks: join(
    Array.from({ length: 24 }, (_, i) => {
      const a = i * 15;
      return segment(
        [...polar(a, TABLE.r - 0.4), TABLE.ring],
        [...polar(a, TABLE.r - 2.2), TABLE.ring],
        P,
      );
    }),
  ),
};
