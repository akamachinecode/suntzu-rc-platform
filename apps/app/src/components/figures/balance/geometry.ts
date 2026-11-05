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
  type SolidPaths,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { AIRFRAME, BATTERY, STOP_DEG, aheadOf, RANGE_PCT } from "./model";
import {
  BASE,
  BASE_H,
  BEAM_HALF,
  BEAM_T,
  BEAM_W,
  FOOT_H,
  MM,
  P,
  PIVOT_Z,
  POINTER,
  SCALE_POST,
  STOP_X,
  at,
} from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const Y: Vec = [0, 1, 0];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");

/* ------------------------------------------------------------ static parts */

const LABEL: Plan = { x: BASE.x + 10, y: BASE.y + BASE.d - 15, w: 38, d: 9, r: 1.5 };
/** Where the pointer's tip sits for each lean: the beam end rises and falls past the scale. */
export function pointerTip(lean: number): Point3 {
  const t = lean * RAD;
  return [
    POINTER.u * Math.cos(t) + POINTER.up * Math.sin(t),
    POINTER.to,
    PIVOT_Z - POINTER.u * Math.sin(t) + POINTER.up * Math.cos(t),
  ];
}

const SCALE_FACE = SCALE_POST.y + SCALE_POST.d;
const SCALE_EDGE = SCALE_POST.x + SCALE_POST.w;
const SCALE_TOP = Math.max(pointerTip(-STOP_DEG)[2], pointerTip(STOP_DEG)[2]) + 6;

function scaleTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  let zero = "";
  for (let deg = -STOP_DEG; deg <= STOP_DEG; deg += 2) {
    const z = pointerTip(deg)[2];
    const big = deg % 4 === 0;
    const tick = segment(
      [SCALE_EDGE, SCALE_FACE, z],
      [SCALE_EDGE - (deg === 0 ? 4 : big ? 3 : 1.8), SCALE_FACE, z],
      P,
    );
    if (deg === 0) zero = tick;
    else (big ? major : minor).push(tick);
  }
  return { minor: join(minor), major: join(major), zero };
}
const SCALE = scaleTicks();

export const STATIC = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 16).map(([x, y]) => cylinder(x, y, 6, -BASE_H - FOOT_H, FOOT_H, P, 24)),
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
  // Rubber-capped stops under each end of the beam.
  stops: [-STOP_X, STOP_X].map((x) => {
    const top = PIVOT_Z - Math.abs(x) * Math.sin(STOP_DEG * RAD) - 0.6;
    return {
      foot: cylinder(x, 0, 5.5, 0, 2.4, P, 24),
      post: cylinder(x, 0, 2.6, 2.4, top - 2.4 - 3, P, 20),
      cap: cylinder(x, 0, 3.6, top - 3, 3, P, 20),
    };
  }),
  // The pillar and its knife edge.
  collar: cylinder(0, 0, 10, 0, 4, P, 36),
  pillar: cylinder(0, 0, 5, 4, PIVOT_Z - 10 - 4, P, 32),
  block: slabOf({ x: -9, y: -11, w: 18, d: 22, r: 1.5 }, PIVOT_Z - 10, 4, P, 3, 0.5),
  knife: G.prismOf(
    G.frameOf([0, 0, PIVOT_Z - 6], Y, [1, 0, 0], [0, 0, 1]),
    [
      [-5, 0],
      [5, 0],
      [0, 6],
    ],
    -10,
    10,
    P,
  ),
  // The scale the pointer reads: an upright just behind the beam's tail end.
  scaleFoot: slabOf(insetPlan(SCALE_POST, -2.5), 0, 2, P, 2),
  scalePost: slabOf(SCALE_POST, 2, SCALE_TOP - 2, P, 2, 0.3),
  scaleMinor: SCALE.minor,
  scaleMajor: SCALE.major,
  scaleZero: SCALE.zero,
};

/* ------------------------------------------------------- the moving beam */

/** A frame tilted by `lean` degrees about the knife edge; positive lean is nose down. */
function beamFrame(lean: number) {
  const t = lean * RAD;
  const u: Vec = [Math.cos(t), 0, -Math.sin(t)];
  const v: Vec = [Math.sin(t), 0, Math.cos(t)];
  const o: Vec = [0, 0, PIVOT_Z];
  const world = (along: number, y: number, up: number): Point3 => [
    o[0] + u[0] * along + v[0] * up,
    y,
    o[2] + u[2] * along + v[2] * up,
  ];
  return { F: G.frameOf(o, Y, u, v), world, u, v };
}

const RANGE = { from: aheadOf(RANGE_PCT[1]) * MM, to: aheadOf(RANGE_PCT[0]) * MM };
const WEIGHT_AT = AIRFRAME.at * MM;
const PACK = { length: 105 * MM, width: 34 * MM, height: 26 * MM };
// Slotted lab weights that add up to the airframe: 1 kg, 100 g and 50 g.
const WEIGHTS = [
  { r: 9, h: 6 },
  { r: 6, h: 3 },
  { r: 5, h: 2.5 },
];

export interface BeamFrame {
  beam: SolidPaths;
  minor: string;
  major: string;
  mark: string;
  range: string;
  rod: SolidPaths;
  weights: SolidPaths[];
  pack: SolidPaths;
  strap: SolidPaths;
  packRule: string;
  pointer: string;
  tip: Flat;
}

export function beamOf(lean: number, battery: number): BeamFrame {
  const { F, world, v } = beamFrame(lean);
  const top = BEAM_T;
  const line = (points: Point3[]) =>
    `M${points
      .map(at)
      .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
      .join("L")}`;
  const minor: string[] = [];
  const major: string[] = [];
  for (let along = -BEAM_HALF + 10; along <= BEAM_HALF - 10; along += 10) {
    if (along === 0) continue;
    const big = along % 50 === 0;
    (big ? major : minor).push(
      line([world(along, BEAM_W, top), world(along, BEAM_W - (big ? 4 : 2.4), top)]),
    );
  }
  let stack = top;
  const weights = WEIGHTS.map(({ r, h }) => {
    const base = world(WEIGHT_AT, 0, stack);
    stack += h;
    return G.disc(0, h, r, G.frameAlong(base as Vec, v), P);
  });
  const b = battery * MM;
  const tip = world(POINTER.u, POINTER.to, POINTER.up);
  return {
    beam: G.prismOf(
      F,
      [
        [-BEAM_HALF, 0],
        [BEAM_HALF, 0],
        [BEAM_HALF, top],
        [-BEAM_HALF, top],
      ],
      -BEAM_W,
      BEAM_W,
      P,
    ),
    minor: minor.join(""),
    major: major.join(""),
    mark: line([world(0, BEAM_W, top), world(0, -BEAM_W, top)]),
    range: line([
      world(RANGE.from, -BEAM_W + 1.4, top),
      world(RANGE.to, -BEAM_W + 1.4, top),
      world(RANGE.to, BEAM_W - 5, top),
      world(RANGE.from, BEAM_W - 5, top),
      world(RANGE.from, -BEAM_W + 1.4, top),
    ]),
    rod: G.disc(0, stack - top + 4, 1.4, G.frameAlong(world(WEIGHT_AT, 0, top) as Vec, v), P),
    weights,
    pack: G.prismOf(
      F,
      [
        [b - PACK.length / 2, top],
        [b + PACK.length / 2, top],
        [b + PACK.length / 2, top + PACK.height],
        [b - PACK.length / 2, top + PACK.height],
      ],
      -PACK.width / 2,
      PACK.width / 2,
      P,
    ),
    strap: G.prismOf(
      F,
      [
        [b - 3, -0.6],
        [b + 3, -0.6],
        [b + 3, top + PACK.height + 0.5],
        [b - 3, top + PACK.height + 0.5],
      ],
      -PACK.width / 2 - 0.5,
      PACK.width / 2 + 0.5,
      P,
    ),
    packRule: [0, 1, 2]
      .map((row) =>
        line([
          world(b - PACK.length / 2 + 3, -PACK.width / 2 + 2.5 + row * 2, top + PACK.height),
          world(
            b - PACK.length / 2 + (row === 1 ? 12 : 18),
            -PACK.width / 2 + 2.5 + row * 2,
            top + PACK.height,
          ),
        ]),
      )
      .join(""),
    pointer: line([world(POINTER.u, POINTER.from, POINTER.up), tip]),
    tip: at(tip),
  };
}

export const BATTERY_LABEL = BATTERY.label;
