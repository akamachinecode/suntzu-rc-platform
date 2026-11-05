import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideRing,
  sideSeam,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { coilAlong, rodBetween, spokes, type Vec } from "../bench/shapes";
import {
  AXLE_X,
  AXLE_Z,
  CHASSIS,
  FLOOR,
  P,
  STAND,
  STAND_TOP,
  TOWER,
  TRACK_Y,
  TYRE,
  at,
} from "./view";

const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const rod = (a: Vec, b: Vec, r: number) => rodBetween(a, b, r, P);
const upright = (x: number, y: number, z0: number, z1: number, r: number) =>
  G.disc(z0, z1, r, G.frameOf([x, y, 0], Z, X, Y), P);
/** A flat part in the x–z plane, from y0 to y1: body sides, the cab. */
const XZ = G.frameOf([0, 0, 0], Y, X, Z);
const sideways = (polygon: Array<[number, number]>, y0: number, y1: number) =>
  G.prismOf(XZ, polygon, y0, y1, P);
/** A flat part in the y–z plane at x, from x0 to x1: the shock towers. */
const across = (polygon: Array<[number, number]>, x0: number, x1: number) =>
  G.prismOf(G.frameOf([0, 0, 0], X, Y, Z), polygon, x0, x1, P);
/** A closed outline on the vertical face y = face. */
const onSide = (points: Array<[number, number]>, face: number) =>
  pathOf(
    points.map(([x, z]) => at([x, face, z])),
    true,
  );

const TOP = FLOOR.z1;

/* ------------------------------------------------------------------ stand */

const STAND_LABEL: Plan = { x: STAND.x + 8, y: STAND.y + STAND.d - 15, w: 30, d: 9, r: 1.5 };

export const STAND_ART = {
  halo: haloOf(STAND, STAND_TOP - 10, 8, P),
  feet: corners(STAND, 9).map(([x, y]) => cylinder(x, y, 4.5, STAND_TOP - 10, 3, P, 24)),
  base: slabOf(STAND, STAND_TOP - 7, 7, P, 8, 1.4),
  groove: planOutline(insetPlan(STAND, 4), STAND_TOP, P),
  screws: dots(corners(STAND, 7).map(([x, y]) => [x, y, STAND_TOP])),
  screwRings: join(corners(STAND, 7).map(([x, y]) => ring(x, y, 1.9, STAND_TOP, P, 16))),
  label: slabOf(STAND_LABEL, STAND_TOP, 0.8, P, 3),
  labelLine: planOutline(insetPlan(STAND_LABEL, 1.4), STAND_TOP + 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [STAND_LABEL.x + 4, STAND_LABEL.y + 2.6 + row * 2],
          [STAND_LABEL.x + (row === 1 ? 16 : 24), STAND_LABEL.y + 2.6 + row * 2],
        ],
        STAND_TOP + 0.8,
        P,
      ),
    ),
  ),
  collar: cylinder(0, 0, 5.5, STAND_TOP, 3, P, 32),
  post: cylinder(0, 0, 2.4, STAND_TOP + 3, FLOOR.z0 - 2.5 - STAND_TOP - 3, P, 28),
  yoke: slabOf({ x: -6, y: -5, w: 12, d: 10, r: 1.2 }, FLOOR.z0 - 2.5, 2.5, P, 3, 0.4),
};

/* ----------------------------------------------------------------- wheels */

/** A wheel at the corner (front?, side): tyre with tread, and the rim on its outer face. */
function wheel(front: boolean, side: 1 | -1) {
  const x = front ? AXLE_X : -AXLE_X;
  const F = G.frameOf([x, 0, AXLE_Z], [0, side, 0], X, Z);
  const s0 = TRACK_Y - TYRE.w / 2;
  const s1 = TRACK_Y + TYRE.w / 2;
  const r = TYRE.r;
  return {
    tyre: G.solidOf(
      [
        [s0, r - 3],
        [s0 + 1.2, r - 0.6, 1],
        [s0 + 3, r, 1],
        [s1 - 3, r, 1],
        [s1 - 1.2, r - 0.6, 1],
        [s1, r - 3],
      ] as Array<[number, number]>,
      F,
      P,
    ),
    // the tread runs between two seams, so every rib ends on one
    tread: G.ribsOf(F, s0 + 2.6, s1 - 2.6, r, 26, P, { fade: [0.05, 0.42], seams: true }),
    rim: G.disc(s1 - 0.6, s1 + 0.3, 8.6, F, P),
    rimLip: G.circleOf(F, s1 + 0.3, 7.6, P, 48) + G.circleOf(F, s1 + 0.3, 2.4, P, 24),
    spokes: spokes(F, s1 + 0.3, 2.4, 7.6, 6, front ? 0.3 : 0.9, P),
    nut: G.disc(s1 + 0.3, s1 + 1.5, 1.9, F, P),
  };
}

export const WHEELS = {
  rearFar: wheel(false, -1),
  frontFar: wheel(true, -1),
  rearNear: wheel(false, 1),
  frontNear: wheel(true, 1),
};

/* ------------------------------------------------------------- suspension */

function corner(front: boolean, side: 1 | -1) {
  const x = front ? AXLE_X : -AXLE_X;
  return {
    arm: slabOf({ x: x - 4, y: side > 0 ? 7 : -24, w: 8, d: 17, r: 1.5 }, 8, 2, P, 3, 0.3),
    hub: slabOf(
      { x: x - 2.6, y: side > 0 ? 20.4 : -23.4, w: 5.2, d: 3, r: 1 },
      8.4,
      10.8,
      P,
      3,
      0.3,
    ),
    pins: dots([[x - 3, side * 9, 10] as Point3, [x + 3, side * 9, 10] as Point3]),
  };
}

export const CORNERS = {
  rearFar: corner(false, -1),
  frontFar: corner(true, -1),
  rearNear: corner(false, 1),
  frontNear: corner(true, 1),
};

/* ----------------------------------------------------------------- shocks */

/** A coil-over from the arm up to its tower: body, shaft, spring, eyes. */
function shock(front: boolean, side: 1 | -1) {
  const lower: Vec = [front ? AXLE_X - 0.5 : -AXLE_X + 0.5, side * 19.5, 10.4];
  const upper: Vec = [front ? TOWER.front + 1.9 : TOWER.rear + 1.8, side * 16, TOWER.z1 - 2];
  const d: Vec = [upper[0] - lower[0], upper[1] - lower[1], upper[2] - lower[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  const F = G.frameAlong(lower, [d[0] / length, d[1] / length, d[2] / length]);
  const split = length * 0.56;
  return {
    eyeLow: G.sphereOf(lower, 1, P),
    body: G.disc(0.6, split, 1.7, F, P),
    shaft: G.disc(split, length - 0.6, 0.55, F, P),
    cupLow: G.disc(length * 0.14, length * 0.14 + 0.6, 2.7, F, P),
    cupHigh: G.disc(length * 0.82, length * 0.82 + 0.6, 2.7, F, P),
    spring: coilAlong(F, length * 0.14 + 0.6, length * 0.82, 2.4, 6, P),
    eyeHigh: G.sphereOf(upper, 1, P),
  };
}

export const SHOCKS = {
  rearFar: shock(false, -1),
  frontFar: shock(true, -1),
  rearNear: shock(false, 1),
  frontNear: shock(true, 1),
};

/* ---------------------------------------------------------------- chassis */

const tower = (x0: number) =>
  across(
    [
      [-14, TOWER.z0],
      [14, TOWER.z0],
      [18, TOWER.z1],
      [-18, TOWER.z1],
    ],
    x0,
    x0 + 1.2,
  );

export const CHASSIS_ART = {
  floor: slabOf(CHASSIS, FLOOR.z0, FLOOR.z1 - FLOOR.z0, P, 6, 0.6),
  railFar: slabOf({ x: -40, y: -12, w: 74, d: 1.6, r: 0.6 }, TOP, 2.4, P, 2),
  railNear: slabOf({ x: -40, y: 10.4, w: 74, d: 1.6, r: 0.6 }, TOP, 2.4, P, 2),
  bulkFront: slabOf({ x: 36, y: -7, w: 8, d: 14, r: 1.5 }, TOP, TOWER.z0 - TOP, P, 3, 0.4),
  bulkRear: slabOf({ x: -47, y: -7, w: 4.6, d: 14, r: 1.2 }, TOP, TOWER.z0 - TOP, P, 3, 0.4),
  bumperFront: slabOf({ x: 44, y: -13, w: 9, d: 26, r: 3 }, 6, 4, P, 4, 0.5),
  bumperRear: slabOf({ x: -56, y: -13, w: 9, d: 26, r: 3 }, 6, 4, P, 4, 0.5),
  towerFront: tower(TOWER.front),
  towerRear: tower(TOWER.rear),
  towerBolts: dots(
    [TOWER.front + 1.2, TOWER.rear + 1.2].flatMap((x) =>
      [-16, 16].map((y) => [x, y, TOWER.z1 - 2] as Point3),
    ),
  ),
  floorScrews: dots(
    [
      [-30, -8],
      [-30, 8],
      [24, -8],
      [24, 8],
    ].map(([x, y]) => [x!, y!, TOP] as Point3),
  ),
};

/* ------------------------------------------------------------- drivetrain */

const CASE: Plan = { x: -42, y: -6, w: 9, d: 10, r: 2 };
const SPUR = { x: -33, z: 17, r: 5.75 };
const SPUR_AXIS = G.frameOf([SPUR.x, 0, SPUR.z], Y, X, Z);
const OUT = G.frameOf([-AXLE_X, 0, AXLE_Z], Y, X, Z);

export const DRIVE_ART = {
  case: slabOf(CASE, TOP, 21 - TOP, P, 4, 0.5),
  caseSeam: sideSeam(CASE, 15, P, 4),
  cupFar: G.disc(-7.5, -6, 1.9, OUT, P),
  cupNear: G.disc(4, 5.5, 1.9, OUT, P),
  boneFar: G.disc(-20.4, -7.5, 0.8, OUT, P),
  boneNear: G.disc(5.5, 20.4, 0.8, OUT, P),
  spur: G.disc(4, 5, SPUR.r, SPUR_AXIS, P),
  spurTeeth: G.ribsOf(SPUR_AXIS, 4, 5, SPUR.r, 60, P, { fade: [0.05, 0.42] }),
  slipper: G.disc(5, 5.8, 2.6, SPUR_AXIS, P),
};

/* ------------------------------------------------------------------ motor */

const MOTOR = { x: SPUR.x + SPUR.r + 1.2, z: SPUR.z, r: 4.5 };
const MOTOR_AXIS = G.frameOf([MOTOR.x, 0, MOTOR.z], Y, X, Z);

export const MOTOR_ART = {
  bell: G.disc(-11.5, -10, 3.2, MOTOR_AXIS, P),
  can: G.disc(-10, 3.4, MOTOR.r, MOTOR_AXIS, P),
  vents: G.ribsOf(MOTOR_AXIS, -8, 1.6, MOTOR.r, 18, P, { fade: [0.06, 0.45], seams: true }),
  pinion: G.disc(3.6, 5.2, 1.2, MOTOR_AXIS, P),
};

/* ---------------------------------------------------------------- battery */

const PACK: Plan = { x: -16, y: -6, w: 34.5, d: 11.75, r: 1.5 };
const PACK_TOP = TOP + 6.25;

export const BATTERY_ART = {
  plug: slabOf({ x: -18.4, y: -2, w: 2.6, d: 3.4, r: 0.5 }, TOP + 2, 2.6, P, 2),
  pack: slabOf(PACK, TOP, PACK_TOP - TOP, P, 4, 0.5),
  label: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [PACK.x + 4, PACK.y + 2.4 + row * 1.8],
          [PACK.x + (row === 1 ? 14 : 21), PACK.y + 2.4 + row * 1.8],
        ],
        PACK_TOP,
        P,
      ),
    ),
  ),
  strap: slabOf({ x: 4, y: -7, w: 2.4, d: 14, r: 0.4 }, TOP - 0.2, PACK_TOP - TOP + 0.8, P, 2),
};

/* -------------------------------------------------------------- steering */

const SAVER: Vec = [22.5, -3.6, TOP + 6.2];
export const STEERING_ART = {
  servo: slabOf({ x: 20, y: -8, w: 5, d: 10, r: 0.6 }, TOP, 5, P, 3, 0.3),
  saver: upright(SAVER[0], SAVER[1], TOP + 5, TOP + 6.4, 1.7),
  links: [-1, 1].map((side) =>
    rod([SAVER[0], SAVER[1] + side * 1.4, SAVER[2]], [AXLE_X - 1.5, side * 20.4, 12.4], 0.45),
  ),
};

/* ------------------------------------------------------------ electronics */

const ESC: Plan = { x: -14, y: 5.8, w: 9, d: 4.4, r: 0.8 };
const RX: Plan = { x: 6, y: 6.2, w: 8, d: 4, r: 0.8 };
export const ELECTRONICS_ART = {
  esc: slabOf(ESC, TOP, 4.8, P, 3, 0.3),
  fan: ring(ESC.x + 4.5, ESC.y + 2.2, 1.6, TOP + 4.8, P, 24),
  fanHub: dots([[ESC.x + 4.5, ESC.y + 2.2, TOP + 4.8]]),
  rx: slabOf(RX, TOP, 5.6, P, 3, 0.3),
  rxSeam: sideSeam(RX, TOP + 4, P, 3),
  antenna: upright(RX.x + 6.5, RX.y + 2, TOP + 5.6, 36, 0.35),
  antennaCap: G.sphereOf([RX.x + 6.5, RX.y + 2, 36.3], 0.6, P),
};

/* ------------------------------------------------------------------- body */

const LOWER: Array<[number, number]> = [
  [-60, 16],
  [58, 16],
  [64, 23],
  [61, 30],
  [-58, 30],
  [-62, 23],
];
const CAB: Array<[number, number]> = [
  [-10, 30],
  [21, 30],
  [12, 41.5],
  [-6, 41.5],
];
const BODY_Y = 27;
const CAB_Y = 21;
const arch = (x0: number) =>
  pathOf(
    Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI;
      return at([x0 + 15.5 * Math.cos(t), BODY_Y, 16 + 9 * Math.sin(t)]);
    }),
  );

/** Points on the near side's outline at height z, between its rear and front edges. */
const sideEnds = (z: number): [number, number] => {
  const rear = -62 + (4 * (z - 23)) / 7;
  const front = 64 - (3 * (z - 23)) / 7;
  return [rear, front];
};

export const BODY_ART = {
  lower: sideways(LOWER, -BODY_Y, BODY_Y),
  // a pair of stripes down the near side, edge to edge
  stripes: join(
    [24.4, 26].map((z) => {
      const [rear, front] = sideEnds(z);
      return pathOf([at([rear, BODY_Y, z]), at([front, BODY_Y, z])]);
    }),
  ),
  // grille slats on the nose, from its upper edge to its lower one
  grille: join([-12, -6, 0, 6, 12].map((y) => pathOf([at([64, y, 23]), at([61, y, 30])]))),
  hood: lineOnTop([28, -BODY_Y], [28, BODY_Y], 30, P),
  bed: onTop(
    [
      [-55, -22],
      [-14, -22],
      [-14, 22],
      [-55, 22],
    ],
    30,
    P,
    true,
  ),
  clips: dots(
    [
      [40, -9],
      [40, 9],
      [-40, -9],
      [-40, 9],
    ].map(([x, y]) => [x!, y!, 30] as Point3),
  ),
  cab: sideways(CAB, -CAB_Y, CAB_Y),
  window: onSide(
    [
      [-7.6, 32],
      [17.2, 32],
      [10.9, 39.7],
      [-4.9, 39.7],
    ],
    CAB_Y,
  ),
  windscreen: pathOf(
    (
      [
        [19.8, -18, 31.9],
        [19.8, 18, 31.9],
        [13, 18, 40.3],
        [13, -18, 40.3],
      ] as Point3[]
    ).map(at),
    true,
  ),
  arches: join([AXLE_X, -AXLE_X].map(arch)),
  number: sideRing([0, BODY_Y, 23], 4.6, "y", P, 32),
};

/** How many solids the figure is built from, counted from the parts above. */
export const PART_COUNT =
  9 + // stand
  4 * 3 + // wheels: tyre, rim, nut
  4 * 2 + // arms and hubs
  4 * 6 + // shocks: two eyes, body, shaft, two spring cups
  9 + // chassis: floor, rails, bulkheads, bumpers, towers
  7 + // drivetrain: case, cups, driveshafts, spur, slipper
  3 + // motor: end bell, can, pinion
  3 + // battery: pack, strap, plug
  4 + // steering: servo, saver, two links
  4 + // electronics: speed control, receiver, antenna tube and cap
  2; // body: shell and cab
