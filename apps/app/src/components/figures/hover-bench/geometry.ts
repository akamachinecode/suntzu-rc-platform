import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  sideMatrix,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import {
  BASE,
  BASE_H,
  BOOM,
  CELL,
  CELL_H,
  DECK,
  DISPLAY,
  DISPLAY_H,
  FOOT_H,
  FRAME,
  HEAD_Z,
  P,
  PLATFORM,
  PLATFORM_H,
  PLATFORM_Z,
  SHAFT_TOP,
  SKID_Y,
  TAIL_X,
  at,
} from "./view";

type Vec = [number, number, number];
const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
export function rod(a: Vec, b: Vec, r: number) {
  const d: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return G.disc(0, Math.hypot(d[0], d[1], d[2]), r, G.frameAlong(a, unit(d)), P, { steps: 14 });
}
const XZ = G.frameOf([0, 0, 0], Y, X, Z);

/* ------------------------------------------------------------------ bench */

const LABEL: Plan = { x: BASE.x + 10, y: BASE.y + BASE.d - 16, w: 40, d: 9, r: 1.5 };
const FACE_Y = DISPLAY.y + DISPLAY.d;

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
  cell: slabOf(CELL, 0, CELL_H, P, 3, 0.4),
  platform: slabOf(PLATFORM, PLATFORM_Z, PLATFORM_H, P, 4, 0.6),
  platformGroove: planOutline(insetPlan(PLATFORM, 2.5), DECK, P),
  // the strap anchors on the deck, one under each skid
  anchors: [-1, 1].map((side) =>
    slabOf({ x: -2.5, y: side * SKID_Y - 2, w: 5, d: 4, r: 0.8 }, DECK, 1, P, 2),
  ),
  // the display on its stalk, wired to the load cell
  stalk: cylinder(DISPLAY.x + DISPLAY.w / 2, DISPLAY.y + DISPLAY.d / 2, 1.6, 0, 6, P, 16),
  display: slabOf(DISPLAY, 6, DISPLAY_H, P, 3, 0.5),
  window: planOutline(insetPlan(DISPLAY, 2), 6 + DISPLAY_H, P),
  faceGrams: sideMatrix([DISPLAY.x + 3, FACE_Y], 6 + DISPLAY_H - 3.4, P, "left"),
  faceUnit: sideMatrix([DISPLAY.x + 3, FACE_Y], 6 + DISPLAY_H - 8.6, P, "left"),
  led: dots([[DISPLAY.x + DISPLAY.w - 3, FACE_Y, 6 + 3]]),
};

/* ---------------------------------------------------- the helicopter body */

const lift = (z: number) => DECK + z;

function skid(side: 1 | -1) {
  const y = side * SKID_Y;
  return {
    tube: rod([-26, y, lift(0.8)], [22, y, lift(0.8)], 0.8),
    toe: rod([22, y, lift(0.8)], [27.5, y, lift(4.4)], 0.8),
    struts: [15, -10].map((x) =>
      rod([x, side * (FRAME.y + 0.6), lift(FRAME.z0 - 0.9)], [x, y, lift(1.2)], 0.9),
    ),
  };
}

const CANOPY: Array<[number, number] | [number, number, number]> = [
  [0, 0],
  [1, 3.2, 1],
  [3, 5.8, 1],
  [7, 8.4, 1],
  [12, 10.5, 1],
  [18, 11.6, 1],
  [26, 12, 1],
  [36, 11.6, 1],
  [44, 10.6, 1],
  [48, 9.6],
];

export const BODY = {
  skidFar: skid(-1),
  skidNear: skid(1),
  cross: [15, -10].map((x) =>
    rod([x, -FRAME.y - 0.6, lift(FRAME.z0 - 0.9)], [x, FRAME.y + 0.6, lift(FRAME.z0 - 0.9)], 0.9),
  ),
  brace: [-1, 1].map((side) =>
    rod([-20, side * (FRAME.y + 0.6), lift(15.2)], [-74, side * 1.2, lift(BOOM.z - 1)], 0.5),
  ),
  boom: rod([BOOM.from, 0, lift(BOOM.z)], [BOOM.to, 0, lift(BOOM.z)], BOOM.r),
  fin: G.prismOf(
    XZ,
    [
      [-122, lift(BOOM.z - 1)],
      [-129, lift(BOOM.z - 1)],
      [-135, lift(BOOM.z - 15)],
      [-128.5, lift(BOOM.z - 15)],
    ],
    -0.3,
    0.3,
    P,
  ),
  gearbox: slabOf(
    { x: TAIL_X - 5, y: -2.2, w: 9, d: 4.4, r: 1 },
    lift(BOOM.z - 2.2),
    4.4,
    P,
    3,
    0.3,
  ),
  tailHub: G.disc(0, 1.4, 1.5, G.frameAlong([TAIL_X, 4.6, lift(BOOM.z)], Y), P),
  tailBlades: [1, -1].map((dir) =>
    G.prismOf(
      G.frameOf([TAIL_X, 6, lift(BOOM.z)], Y, X, Z),
      dir > 0
        ? [
            [-1.4, 1.6],
            [1.4, 1.6],
            [1, 12.5],
            [-1.3, 12.5],
          ]
        : [
            [-1.4, -1.6],
            [-1.3, -12.5],
            [1, -12.5],
            [1.4, -1.6],
          ],
      0,
      0.4,
      P,
    ),
  ),
  plates: [-1, 1].map((side) =>
    G.prismOf(
      XZ,
      [
        [FRAME.x0, lift(FRAME.z0)],
        [22, lift(FRAME.z0)],
        [28, lift(22)],
        [28, lift(34)],
        [14, lift(FRAME.z1 - 6)],
        [4, lift(FRAME.z1)],
        [-8, lift(FRAME.z1)],
        [FRAME.x0, lift(34)],
      ],
      side > 0 ? FRAME.y : -FRAME.y - 0.6,
      side > 0 ? FRAME.y + 0.6 : -FRAME.y,
      P,
    ),
  ),
  holes: join(
    (
      [
        [-14, 24, 3.2],
        [-3.5, 22, 2.4],
        [-12, 36, 2.2],
      ] as Array<[number, number, number]>
    ).map(([x, z, r]) => G.circleOf(G.frameAlong([x, 0, lift(z)], Y), FRAME.y + 0.6, r, P, 40)),
  ),
  canopy: G.solidOf(
    CANOPY.map((k) => [...k] as [number, number]),
    G.frameOf([58, 0, lift(34)], [-1, 0, 0], Z, Y),
    P,
  ),
  shaft: G.disc(lift(FRAME.z1), lift(SHAFT_TOP), 1.25, G.frameAlong([0, 0, 0], Z), P),
  swash: G.disc(lift(52), lift(55), 6, G.frameAlong([0, 0, 0], Z), P),
  hub: slabOf({ x: -2.6, y: -3.4, w: 5.2, d: 6.8, r: 1.2 }, lift(HEAD_Z - 2.4), 4.8, P, 3, 0.4),
  button: G.disc(lift(HEAD_Z + 2.4), lift(HEAD_Z + 3.6), 1.7, G.frameAlong([0, 0, 0], Z), P),
};
