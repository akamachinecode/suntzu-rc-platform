import {
  corners,
  cylinder,
  depthOf,
  extrude,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  slabOf,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { LOWER_BALL_R, SERVO_ANGLES } from "./model";
import { BASE, BASE_H, BEARING, BEARING_H, FOOT_H, LOWER, P, POST, SERVO, SHAFT, at } from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");

/** A unit pair for the radial line at `angle`: out along it, and across it (anticlockwise). */
export const axesOf = (angle: number) => {
  const a = angle * RAD;
  return { out: [Math.cos(a), Math.sin(a)] as Plane, across: [-Math.sin(a), Math.cos(a)] as Plane };
};

/** A point given as (out, across) on the radial line at `angle`. */
export const onLine = (angle: number, out: number, across: number): Plane => {
  const { out: o, across: c } = axesOf(angle);
  return [o[0] * out + c[0] * across, o[1] * out + c[1] * across];
};

/** A rectangle on the floor, square to the radial line at `angle`. */
const box = (angle: number, out0: number, out1: number, across0: number, across1: number) => [
  onLine(angle, out0, across0),
  onLine(angle, out1, across0),
  onLine(angle, out1, across1),
  onLine(angle, out0, across1),
];

/* ------------------------------------------------------------------ bench */

const LABEL: Plan = { x: BASE.x + 10, y: BASE.y + BASE.d - 22, w: 46, d: 12, r: 2 };

export const BENCH = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 18).map(([x, y]) => cylinder(x, y, 8, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  base: slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 6), 0, P),
  screwRings: join(corners(BASE, 10).map(([x, y]) => ring(x, y, 3, 0, P, 16))),
  screws: dots(corners(BASE, 10).map(([x, y]) => [x, y, 0])),
  label: slabOf(LABEL, 0, 1, P, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.8), 1, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [LABEL.x + 5, LABEL.y + 3.4 + row * 2.6],
          [LABEL.x + (row === 1 ? 24 : 36), LABEL.y + 3.4 + row * 2.6],
        ],
        1,
        P,
      ),
    ),
  ),
  bearing: slabOf(BEARING, 0, BEARING_H, P, 4, 0.6),
  bearingRing: ring(0, 0, 6, BEARING_H, P, 32),
  collar: cylinder(0, 0, 5, BEARING_H, 4, P, 28),
  shaft: cylinder(0, 0, SHAFT.r, BEARING_H + 4, SHAFT.top - BEARING_H - 4, P, 20),
  post: cylinder(POST.x, 0, POST.r, 0, POST.top, P, 18),
  postFoot: cylinder(POST.x, 0, 5, 0, 3, P, 24),
  // The guide's slot: two cheeks either side of the bottom ring's pin.
  cheeks: [-1, 1].map((side) =>
    slabOf(
      { x: POST.x - 6, y: side > 0 ? 1.6 : -4.6, w: 6, d: 3, r: 0.8 },
      LOWER.z - 10,
      22,
      P,
      3,
      0.3,
    ),
  ),
};

/* ----------------------------------------------------------------- servos */

export interface ServoArt {
  angle: number;
  depth: number;
  pad: ReturnType<typeof extrude>;
  body: ReturnType<typeof extrude>;
  ears: ReturnType<typeof extrude>;
  screws: Flat[];
  label: string;
  spline: ReturnType<typeof G.disc>;
}

function servoAt(angle: number): ServoArt {
  const { pivotR, depth, width, gap, top, pivotZ } = SERVO;
  const near = -gap;
  const far = -gap - width;
  const out0 = pivotR - 3;
  const out1 = pivotR - 3 + depth;
  const { across } = axesOf(angle);
  const pivot = onLine(angle, pivotR, 0);
  return {
    angle,
    depth: depthOf([...onLine(angle, pivotR + 6, -12), 20] as Point3, P),
    pad: extrude(box(angle, out0 - 2, out1 + 2, far - 4, near + 2), 0, 4, P),
    body: extrude(box(angle, out0, out1, far, near), 4, top - 4, P, { bevel: 0.5 }),
    ears: extrude(box(angle, out0 + 1, out1 - 1, far - 4.5, near + 2.5), top - 10, 1.6, P),
    screws: dots(
      [far - 2.6, near + 1.2].map(
        (c) => [...onLine(angle, (out0 + out1) / 2, c), top - 8.4] as Point3,
      ),
    ),
    label: onTop([onLine(angle, out0 + 3, far + 5), onLine(angle, out0 + 3, near - 6)], top, P),
    spline: G.disc(
      0,
      gap,
      3,
      G.frameAlong(
        [pivot[0] - across[0] * gap, pivot[1] - across[1] * gap, pivotZ],
        [across[0], across[1], 0],
      ),
      P,
    ),
  };
}

const ALL = SERVO_ANGLES.map(servoAt);
const SHAFT_DEPTH = depthOf([0, 0, 20], P);
/** Servos behind the shaft are drawn before the swashplate, the rest after it. */
export const SERVOS_BACK = ALL.filter((s) => s.depth < SHAFT_DEPTH);
export const SERVOS_FRONT = ALL.filter((s) => s.depth >= SHAFT_DEPTH);

/** Which of the bottom ring's balls sit on its far side, behind the ring. */
export const LOWER_BACK = SERVO_ANGLES.map(
  (angle) =>
    depthOf([...onLine(angle, LOWER_BALL_R, 0), LOWER.z] as Point3, P) <
    depthOf([0, 0, LOWER.z], P),
);
export const SHAFT_AXIS = G.frameAlong([0, 0, 0], Z);
