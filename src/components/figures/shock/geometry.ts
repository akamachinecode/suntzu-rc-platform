import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  segment,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { uprightCoil, type Vec } from "../bench/shapes";
import { DROP_MM, WINDOW_S, type Drop } from "./model";
import {
  BASE,
  BASE_H,
  BODY,
  CARRIAGE_H,
  CHART,
  EYE_Z,
  FOOT_H,
  P,
  PERCH_Z,
  RIDE_Z,
  ROD_TOP,
  ROD_Y,
  SCALE,
  SHAFT_R,
  SPRING,
  at,
} from "./view";

const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const upright = (x: number, y: number, z0: number, z1: number, r: number) =>
  G.disc(z0, z1, r, G.frameOf([x, y, 0], Z, [1, 0, 0], Y), P);
const across = (x: number, z: number, y0: number, y1: number, r: number) =>
  G.disc(y0, y1, r, G.frameOf([x, 0, z], Y, [1, 0, 0], Z), P);

const LABEL: Plan = { x: BASE.x + 6, y: BASE.y + 8, w: 30, d: 9, r: 1.5 };

/* Heights on the moving side, all measured at the settled ride height. */
export const CUP_Z = RIDE_Z - 12; // underside of the upper spring cup
const CLEVIS_Z = RIDE_Z - 9;
const SHAFT_TOP = CUP_Z + 3;

export const STATIC = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 14).map(([x, y]) => cylinder(x, y, 5, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  base: slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4),
  groove: planOutline(insetPlan(BASE, 4.5), 0, P),
  screwRings: join(corners(BASE, 7).map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: dots(corners(BASE, 7).map(([x, y]) => [x, y, 0])),
  label: slabOf(LABEL, 0, 0.8, P, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [LABEL.x + 4, LABEL.y + 2.6 + row * 2],
          [LABEL.x + (row === 1 ? 16 : 24), LABEL.y + 2.6 + row * 2],
        ],
        0.8,
        P,
      ),
    ),
  ),

  rods: [-ROD_Y, ROD_Y].map((y) => ({
    collar: cylinder(0, y, 5.5, 0, 4, P, 28),
    rod: upright(0, y, 4, ROD_TOP, 2.5),
  })),
  top: slabOf({ x: -7, y: -ROD_Y - 6, w: 14, d: 2 * (ROD_Y + 6), r: 2 }, ROD_TOP, 7, P, 3, 0.4),
  topScrews: dots([-ROD_Y, ROD_Y].map((y) => [0, y, ROD_TOP + 7])),

  // the lower mount: a clevis on the base, the shock's eye on a bolt through it
  clevis: slabOf({ x: -6, y: -7, w: 12, d: 14, r: 1.5 }, 0, 5, P, 3, 0.4),
  cheeks: [-5.5, 3.5].map((y) => slabOf({ x: -4, y, w: 8, d: 2, r: 0.6 }, 5, 10, P, 2)),
  eye: across(0, EYE_Z, -3.5, 3.5, 3.6),
  bolt: across(0, EYE_Z, 3.5, 6.5, 1.6),

  // the body, its threaded collar and cap
  foot: upright(0, 0, EYE_Z + 3, BODY.z0, 4.5),
  body: upright(0, 0, BODY.z0, BODY.z1, BODY.r),
  threads: join(
    [36, 40, 44, 48, 52, 56].map((z) =>
      G.arcOf(G.frameOf([0, 0, 0], Z, [1, 0, 0], Y), z, BODY.r, P),
    ),
  ),
  // the spring sits on the perch's rim, so its first turn starts on the perch's edge
  perch: upright(0, 0, PERCH_Z - 2, PERCH_Z, SPRING.r),
  cap: upright(0, 0, BODY.z1, BODY.z1 + 3, 6.5),

  scale: slabOf({ ...SCALE, r: 0.6 }, 0, ROD_TOP - 8, P, 2, 0.3),
  scaleTicks: scaleTicks(),

  chart: slabOf(CHART, 0, 1.2, P, 3, 0.3),
  chartFrame: planOutline(insetPlan(CHART, 2.5), 1.2, P),
  chartZero: onTop(
    [
      [chartX(0), CHART.y + 2.5],
      [chartX(0), CHART.y + CHART.d - 2.5],
    ],
    1.2,
    P,
  ),
  // the moment of release and the end of the record, edge to edge across the paper
  chartEnds: join(
    [0, WINDOW_S].map((t) =>
      onTop(
        [
          [CHART.x + 2.5, chartY(t)],
          [CHART.x + CHART.w - 2.5, chartY(t)],
        ],
        1.2,
        P,
      ),
    ),
  ),
  chartTicks: join(
    [0.2, 0.4, 0.6].map((t) =>
      onTop(
        [
          [CHART.x + 2.5, chartY(t)],
          [CHART.x + 5, chartY(t)],
        ],
        1.2,
        P,
      ),
    ),
  ),
};

/* The moving side: shaft, spring cup, clevis, carriage, weights, pointer. */
export const MOVING = {
  shaft: upright(0, 0, BODY.z1 - 6, SHAFT_TOP, SHAFT_R),
  cup: upright(0, 0, CUP_Z, CUP_Z + 3, SPRING.r + 0.6),
  clevis: slabOf({ x: -4, y: -5, w: 8, d: 10, r: 1.2 }, CLEVIS_Z, RIDE_Z - CLEVIS_Z, P, 2, 0.3),
  eye: across(0, CLEVIS_Z + 3, -5.6, 5.6, 1.4),
  bushings: [-ROD_Y, ROD_Y].map((y) => upright(0, y, RIDE_Z - 2, RIDE_Z + CARRIAGE_H + 2, 4.6)),
  carriage: slabOf(
    { x: -9, y: -ROD_Y - 5, w: 18, d: 2 * (ROD_Y + 5), r: 2 },
    RIDE_Z,
    CARRIAGE_H,
    P,
    4,
    0.6,
  ),
  weights: [
    { r: 10, h: 5 },
    { r: 8, h: 4 },
    { r: 6.5, h: 3.5 },
  ].reduce<{ z: number; parts: ReturnType<typeof upright>[] }>(
    (stack, { r, h }) => ({
      z: stack.z + h,
      parts: [...stack.parts, upright(0, 0, stack.z, stack.z + h, r)],
    }),
    { z: RIDE_Z + CARRIAGE_H, parts: [] },
  ).parts,
  spindle: upright(0, 0, RIDE_Z + CARRIAGE_H + 12.5, RIDE_Z + CARRIAGE_H + 16, 1.6),
  pointer: slabOf(
    { x: -1, y: ROD_Y + 5, w: 2, d: SCALE.y - ROD_Y - 5 + 0.6, r: 0.3 },
    RIDE_Z - 1.2,
    1.2,
    P,
    2,
  ),
};

/** The spring between the body's perch and the cup, `x` mm above the settled height. */
export function springAt(x: number) {
  return uprightCoil(0, 0, SPRING.r, PERCH_Z, CUP_Z + x, SPRING.turns, P);
}

/** The chart: displacement along x (up the paper is high), time along y. */
function chartX(mm: number) {
  return CHART.x + CHART.w * 0.64 - mm * 0.78;
}
function chartY(t: number) {
  return CHART.y + 7 + (t / WINDOW_S) * (CHART.d - 12);
}

export function traceOf(drop: Drop) {
  return onTop(
    drop.trace.map(([t, mm]) => [chartX(mm), chartY(t)] as [number, number]),
    1.2,
    P,
  );
}

export function traceDot(t: number, mm: number): Flat {
  return at([chartX(mm), chartY(Math.min(WINDOW_S, t)), 1.2]);
}

/** Millimetre ticks on the scale's front face, around the carriage's travel; the zero is ride height. */
function scaleTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  let zero = "";
  const face = SCALE.x + SCALE.w;
  for (let mm = -16; mm <= DROP_MM + 4; mm += 2) {
    const z = RIDE_Z + mm;
    const big = mm % 10 === 0;
    const tick = segment(
      [face, SCALE.y, z],
      [face, SCALE.y + (mm === 0 ? 3 : big ? 2.2 : 1.2), z],
      P,
    );
    if (mm === 0) zero = tick;
    else (big ? major : minor).push(tick);
  }
  return { minor: join(minor), major: join(major), zero };
}
