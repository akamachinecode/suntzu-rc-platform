import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  lineOnTop,
  onTop,
  planOutline,
  ring,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import {
  BLADE,
  BOOM,
  CANOPY,
  FRAME_BOTTOM,
  GEAR,
  HEAD_Z,
  MOTOR,
  P,
  PLATE,
  PLATE_T,
  PLATE_Y,
  PINION_R,
  POST_X,
  SHAFT,
  SKID_Y,
  STAND,
  STAND_TOP,
  SWASH_Z,
  TAIL_ROTOR,
  TAIL_X,
  TRAY,
  at,
} from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** A round rod or tube from a to b. */
function rod(a: Vec, b: Vec, r: number) {
  const d: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return G.disc(0, Math.hypot(d[0], d[1], d[2]), r, G.frameAlong(a, unit(d)), P);
}

/** A flat part standing in the x–z plane, from y0 to y1: frame plates, fins, tail blades. */
const XZ = G.frameOf([0, 0, 0], Y, X, Z);
const sideways = (polygon: Array<[number, number]>, y0: number, y1: number) =>
  G.prismOf(XZ, polygon, y0, y1, P);

const upright = (x: number, y: number, z0: number, z1: number, r: number) =>
  G.disc(z0, z1, r, G.frameOf([x, y, 0], Z, X, Y), P);

const ball = (point: Vec, r: number) => G.sphereOf(point, r, P);

/* ------------------------------------------------------------------ stand */

const STAND_LABEL: Plan = { x: STAND.x + 8, y: STAND.y + STAND.d - 16, w: 34, d: 9, r: 1.5 };

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
          [STAND_LABEL.x + (row === 1 ? 18 : 27), STAND_LABEL.y + 2.6 + row * 2],
        ],
        STAND_TOP + 0.8,
        P,
      ),
    ),
  ),
  collar: cylinder(POST_X, 0, 5.5, STAND_TOP, 3, P, 32),
  post: cylinder(POST_X, 0, 2.4, STAND_TOP + 3, FRAME_BOTTOM - 3 - STAND_TOP - 3, P, 28),
  yoke: slabOf(
    { x: POST_X - 4, y: -PLATE_Y - PLATE_T, w: 8, d: 2 * (PLATE_Y + PLATE_T), r: 1.2 },
    FRAME_BOTTOM - 3,
    3,
    P,
    3,
    0.4,
  ),
};

/* ------------------------------------------------------------------ skids */

/** The landing gear: a cross piece under the frame, bent struts out to each skid tube. */
function skidSide(side: 1 | -1) {
  const y = side * SKID_Y;
  return {
    tube: rod([-26, y, 0], [22, y, 0], 0.8),
    toe: rod([22, y, 0], [27.5, y, 3.6], 0.8),
    cap: ball([-26, y, 0], 0.85),
    struts: [15, -10].map((x) =>
      rod([x, side * (PLATE_Y + PLATE_T), FRAME_BOTTOM - 0.9], [x, y, 0.4], 0.9),
    ),
  };
}

export const SKIDS_FAR = skidSide(-1);
export const SKIDS_NEAR = skidSide(1);
export const SKID_CROSS = [15, -10].map((x) =>
  rod([x, -PLATE_Y - PLATE_T, FRAME_BOTTOM - 0.9], [x, PLATE_Y + PLATE_T, FRAME_BOTTOM - 0.9], 0.9),
);

/* ------------------------------------------------------------------- tail */

const ROD_Y = 3.1;

export const TAIL_ART = {
  braceFar: rod([-20, -PLATE_Y - PLATE_T, 15.2], [-74, -1.2, BOOM.z - 1], 0.5),
  braceNear: rod([-20, PLATE_Y + PLATE_T, 15.2], [-74, 1.2, BOOM.z - 1], 0.5),
  braceClamp: G.disc(-1.4, 1.4, BOOM.r + 0.6, G.frameAlong([-74, 0, BOOM.z], X), P),
  boom: rod([BOOM.from, 0, BOOM.z], [BOOM.to, 0, BOOM.z], BOOM.r),
  stabClamp: G.disc(-1.2, 1.2, BOOM.r + 0.5, G.frameAlong([-100, 0, BOOM.z], X), P),
  stab: slabOf({ x: -104, y: -9, w: 8, d: 18, r: 1.6 }, BOOM.z - BOOM.r - 1, 0.5, P, 4),
  fin: sideways(
    [
      [-124, BOOM.z - 1],
      [-131, BOOM.z - 1],
      [-137, BOOM.z - 15],
      [-130.5, BOOM.z - 15],
    ],
    -0.3,
    0.3,
  ),
  gearbox: slabOf({ x: -133, y: -2.2, w: 9, d: 4.4, r: 1 }, BOOM.z - 2.2, 4.4, P, 3, 0.3),
  shaft: rod([TAIL_X, 2.2, BOOM.z], [TAIL_X, TAIL_ROTOR.y + 0.9, BOOM.z], 0.5),
  slider: G.disc(0, 0.8, 1.1, G.frameAlong([TAIL_X, 3.3, BOOM.z], Y), P),
  hub: G.disc(0, 1.4, 1.5, G.frameAlong([TAIL_X, TAIL_ROTOR.y - 1.4, BOOM.z], Y), P),
  // Two blades in the plane of the tail rotor, one up and one down.
  blades: [1, -1].map((dir) =>
    G.prismOf(
      G.frameOf([TAIL_X, TAIL_ROTOR.y, BOOM.z], Y, X, Z),
      dir > 0
        ? [
            [-1.4, 1.6],
            [1.4, 1.6],
            [1, TAIL_ROTOR.r],
            [-1.3, TAIL_ROTOR.r],
          ]
        : [
            [-1.4, -1.6],
            [-1.3, -TAIL_ROTOR.r],
            [1, -TAIL_ROTOR.r],
            [1.4, -1.6],
          ],
      0,
      0.4,
      P,
    ),
  ),
  servo: slabOf({ x: -44, y: 1.6, w: 6, d: 3, r: 0.6 }, BOOM.z - 3, 6, P, 3, 0.3),
  servoArm: rod([-39.6, ROD_Y, BOOM.z + 3.4], [-37.2, ROD_Y, BOOM.z + 3.4], 0.45),
  // The control rod runs aft along the boom to the pitch slider's lever.
  pushrod: rod([-37.4, ROD_Y, BOOM.z + 3.2], [TAIL_X + 1.6, ROD_Y, BOOM.z + 1.2], 0.3),
  guides: [-70, -96].map((x) => rod([x, 0, BOOM.z + BOOM.r], [x, ROD_Y, BOOM.z + 2.5], 0.3)),
};

/* ------------------------------------------------------------------ frame */

const platesAt = (y0: number) => sideways(PLATE, y0, y0 + PLATE_T);
const HOLES: Array<[number, number, number]> = [
  [-14, 24, 3.2],
  [-3.5, 22, 2.4],
  [-12, 36, 2.2],
];

export const FRAME_ART = {
  plateFar: platesAt(-PLATE_Y - PLATE_T),
  plateNear: platesAt(PLATE_Y),
  // Lightening holes and the screws that hold the plates to their spacers.
  holes: join(
    HOLES.map(([x, z, r]) => G.circleOf(G.frameAlong([x, 0, z], Y), PLATE_Y + PLATE_T, r, P, 40)),
  ),
  screws: dots(
    (
      [
        [-19, 17],
        [19, 17],
        [25, 31],
        [-19, 32],
        [-5, 49.5],
        [1, 49.5],
      ] as Array<[number, number]>
    ).map(([x, z]) => [x, PLATE_Y + PLATE_T, z]),
  ),
  shaft: upright(0, 0, SHAFT.from, SHAFT.to, SHAFT.r),
  collar: upright(0, 0, SHAFT.from, GEAR.z, 2.2),
  gear: upright(0, 0, GEAR.z, GEAR.z + GEAR.h, GEAR.r),
  gearTeeth: G.ribsOf(G.frameAlong([0, 0, 0], Z), GEAR.z, GEAR.z + GEAR.h, GEAR.r, 121, P, {
    fade: [0.04, 0.4],
  }),
  hub: upright(0, 0, GEAR.z + GEAR.h, GEAR.z + GEAR.h + 1.6, 3),
  bearing: slabOf({ x: -4, y: -PLATE_Y, w: 8, d: 2 * PLATE_Y, r: 1 }, 49, 4, P, 3, 0.4),
  boomClamp: slabOf({ x: -24.5, y: -4, w: 6.5, d: 8, r: 1 }, BOOM.z - 3.5, 7, P, 3, 0.4),
  tray: slabOf(
    { x: TRAY.x0, y: -PLATE_Y + 0.6, w: TRAY.x1 - TRAY.x0, d: 2 * PLATE_Y - 1.2, r: 1 },
    TRAY.z,
    1,
    P,
    3,
    0.3,
  ),
  servoTray: slabOf({ x: -15.5, y: -PLATE_Y, w: 9, d: 2 * PLATE_Y, r: 0.8 }, 45, 1, P, 3),
};

/* ------------------------------------------------------------------ motor */

const CAN = G.frameAlong([MOTOR.x, 0, 0], Z);
export const MOTOR_ART = {
  pinion: upright(MOTOR.x, 0, GEAR.z, GEAR.z + GEAR.h, PINION_R),
  pinionTeeth: G.ribsOf(CAN, GEAR.z, GEAR.z + GEAR.h, PINION_R, 11, P, { fade: [0.08, 0.5] }),
  shaft: upright(MOTOR.x, 0, GEAR.z + GEAR.h, MOTOR.z0, 0.6),
  can: upright(MOTOR.x, 0, MOTOR.z0, MOTOR.z1, MOTOR.r),
  canVents: G.ribsOf(CAN, MOTOR.z0 + 2, MOTOR.z1 - 2, MOTOR.r, 18, P, {
    fade: [0.06, 0.45],
    seams: true,
  }),
  mount: slabOf(
    { x: MOTOR.x - 5, y: -PLATE_Y, w: 10, d: 2 * PLATE_Y, r: 1 },
    MOTOR.z1,
    1.2,
    P,
    3,
    0.3,
  ),
  mountScrews: dots(
    [
      [MOTOR.x - 2.2, -2.2],
      [MOTOR.x + 2.2, 2.2],
      [MOTOR.x - 2.2, 2.2],
      [MOTOR.x + 2.2, -2.2],
    ].map(([x, y]) => [x!, y!, MOTOR.z1 + 1.2]),
  ),
};

/* ----------------------------------------------------------------- servos */

const SERVO_Z = 46;
const SERVO_H = 6;
const ARM_Z = SERVO_Z + SERVO_H + 1.2;
/** Where each servo's link meets the swashplate's lower ring, 120° apart. */
const LOWER = [60, -60, 180].map((deg) => {
  const a = deg * RAD;
  return [6.6 * Math.cos(a), 6.6 * Math.sin(a)] as [number, number];
});

function sideServo(side: 1 | -1) {
  const y0 = side > 0 ? PLATE_Y + PLATE_T + 0.4 : -PLATE_Y - PLATE_T - 3.4;
  const spline: [number, number] = [5, side * 8.6];
  const end = LOWER[side > 0 ? 0 : 1]!;
  return {
    body: slabOf({ x: 0.5, y: y0, w: 6, d: 3, r: 0.6 }, SERVO_Z, SERVO_H, P, 3, 0.3),
    tabs: slabOf(
      {
        x: -0.8,
        y: side > 0 ? PLATE_Y + PLATE_T : -PLATE_Y - PLATE_T - 0.8,
        w: 8.6,
        d: 0.8,
        r: 0.3,
      },
      SERVO_Z + 3.4,
      1,
      P,
      2,
    ),
    spline: upright(spline[0], spline[1], SERVO_Z + SERVO_H, ARM_Z - 0.4, 0.8),
    arm: rod([spline[0], spline[1], ARM_Z], [end[0], end[1], ARM_Z], 0.45),
    ball: ball([end[0], end[1], ARM_Z + 0.5], 0.6),
  };
}

export const SERVO_FAR = sideServo(-1);
export const SERVO_NEAR = sideServo(1);
const REAR = LOWER[2]!;
export const SERVO_REAR = {
  body: slabOf({ x: -15, y: -1.5, w: 6, d: 3, r: 0.6 }, SERVO_Z, SERVO_H, P, 3, 0.3),
  spline: upright(-10.6, 0, SERVO_Z + SERVO_H, ARM_Z - 0.4, 0.8),
  arm: rod([-10.6, 0, ARM_Z], [REAR[0], REAR[1], ARM_Z], 0.45),
  ball: ball([REAR[0], REAR[1], ARM_Z + 0.5], 0.6),
};

/* -------------------------------------------------------------- swashplate */

const UPPER = [80, -80].map((deg) => {
  const a = deg * RAD;
  return [5.8 * Math.cos(a), 5.8 * Math.sin(a)] as [number, number];
});

export const SWASH_ART = {
  links: LOWER.map(([x, y]) => rod([x, y, ARM_Z + 1], [x, y, SWASH_Z + 0.2], 0.42)),
  linkEnds: LOWER.map(([x, y]) => upright(x, y, ARM_Z + 0.6, ARM_Z + 2.4, 0.7)),
  lower: upright(0, 0, SWASH_Z, SWASH_Z + 1.5, 6),
  lowerBalls: LOWER.map(([x, y]) => ball([x, y, SWASH_Z + 0.7], 0.65)),
  upper: upright(0, 0, SWASH_Z + 1.5, SWASH_Z + 3, 5.2),
  upperBalls: UPPER.map(([x, y]) => ball([x, y, SWASH_Z + 2.3], 0.6)),
  seam: G.arcOf(G.frameAlong([0, 0, 0], Z), SWASH_Z + 1.5, 6, P),
};

/* ------------------------------------------------------------------- head */

const GRIP = { x: -2.6, w: 5.2, from: 4, to: 12.5 };
const ARM_BALL = (side: 1 | -1): Vec => [4.9, side * 7.4, HEAD_Z];

function grip(side: 1 | -1) {
  const plan: Plan = {
    x: GRIP.x,
    y: side > 0 ? GRIP.from : -GRIP.to,
    w: GRIP.w,
    d: GRIP.to - GRIP.from,
    r: 1,
  };
  const bolt: Point3 = [0, side * BLADE.y, HEAD_Z + 1.9];
  return {
    lower: slabOf(plan, HEAD_Z - 1.9, 1.3, P, 3, 0.3),
    upper: slabOf(plan, HEAD_Z + 0.6, 1.3, P, 3, 0.3),
    arm: slabOf(
      { x: GRIP.x + GRIP.w - 0.4, y: side * 7.4 - 0.7, w: 2.8, d: 1.4, r: 0.4 },
      HEAD_Z - 0.6,
      1.2,
      P,
      2,
    ),
    armBall: ball(ARM_BALL(side), 0.6),
    bolt: at(bolt),
    boltRing: ring(bolt[0], bolt[1], 1.2, bolt[2], P, 16),
  };
}

export const HEAD_ART = {
  pitchLinks: UPPER.map(([x, y], index) => {
    const top = ARM_BALL(index === 0 ? 1 : -1);
    return rod([x, y, SWASH_Z + 2.9], [top[0], top[1], top[2] - 0.6], 0.4);
  }),
  hub: slabOf({ x: -2.6, y: -3.4, w: 5.2, d: 6.8, r: 1.2 }, HEAD_Z - 2.4, 4.8, P, 3, 0.4),
  spindle: rod([0, -GRIP.from - 0.2, HEAD_Z], [0, GRIP.from + 0.2, HEAD_Z], 0.8),
  far: grip(-1),
  near: grip(1),
  button: upright(0, 0, HEAD_Z + 2.4, HEAD_Z + 3.6, 1.7),
};

/* ----------------------------------------------------------------- blades */

/** A main blade folded back along the boom, as on a shelf: its root still in the grip. */
function blade(side: 1 | -1) {
  const y0 = side * BLADE.y - BLADE.chord / 2;
  const plan: Plan = { x: BLADE.to, y: y0, w: BLADE.from - BLADE.to, d: BLADE.chord, r: 2.6 };
  const top = HEAD_Z - BLADE.t / 2 + BLADE.t;
  return {
    body: slabOf(plan, HEAD_Z - BLADE.t / 2, BLADE.t, P, 6, 0.4),
    // A strip of tracking tape near the tip, edge to edge.
    tape: join(
      [BLADE.to + 7, BLADE.to + 9].map((x) =>
        lineOnTop([x, y0 + 0.2], [x, y0 + BLADE.chord - 0.2], top, P),
      ),
    ),
  };
}

export const BLADES_ART = { far: blade(-1), near: blade(1) };

/* ---------------------------------------------------------------- battery */

const PACK: Plan = { x: TRAY.x0 + 2, y: -4.3, w: 26, d: 8.6, r: 1.2 };
const PACK_TOP = TRAY.z + 1 + 6.5;

export const BATTERY_ART = {
  pack: slabOf(PACK, TRAY.z + 1, 6.5, P, 4, 0.5),
  label: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [PACK.x + 4, PACK.y + 2 + row * 1.6],
          [PACK.x + (row === 1 ? 12 : 17), PACK.y + 2 + row * 1.6],
        ],
        PACK_TOP,
        P,
      ),
    ),
  ),
  strap: slabOf({ x: PACK.x + 13, y: -4.8, w: 2.6, d: 9.6, r: 0.4 }, TRAY.z + 0.6, 7.3, P, 2),
  plug: slabOf({ x: PACK.x - 2.2, y: -1.4, w: 2.4, d: 2.8, r: 0.5 }, TRAY.z + 2.4, 2.6, P, 2),
};

/* ------------------------------------------------------------ electronics */

const ON_PLATE = PLATE_Y + PLATE_T;
const ESC: Plan = { x: -16, y: ON_PLATE, w: 11, d: 2.2, r: 0.6 };

export const ELECTRONICS_ART = {
  esc: slabOf(ESC, 18, 7, P, 3, 0.3),
  // Heat-sink fins along the speed controller's top.
  escFins: join(
    [0, 1, 2, 3, 4, 5].map((i) =>
      lineOnTop(
        [ESC.x + 1.6 + i * 1.6, ESC.y + 0.3],
        [ESC.x + 1.6 + i * 1.6, ESC.y + ESC.d - 0.3],
        25,
        P,
      ),
    ),
  ),
  rx: slabOf({ x: 9, y: ON_PLATE, w: 6, d: 1.8, r: 0.5 }, 18, 5, P, 3, 0.3),
  rxLed: dots([[13.6, ON_PLATE + 1.8, 21.6]]),
  fbl: slabOf({ x: -21, y: ON_PLATE, w: 5, d: 2, r: 0.6 }, 27, 5, P, 3, 0.3),
  fblLed: dots([[-17, ON_PLATE + 2, 30.5]]),
};

/* ----------------------------------------------------------------- canopy */

const NOSE = G.frameOf([CANOPY.nose, 0, CANOPY.z], [-1, 0, 0], [0, 0, 1], [0, 1, 0]);
const CANOPY_PROFILE: Array<[number, number, number?]> = [
  [0, 0],
  [1, 3.2, 1],
  [3, 5.8, 1],
  [7, 8.4, 1],
  [12, 10.5, 1],
  [18, 11.6, 1],
  [26, 12, 1],
  [36, 11.6, 1],
  [44, 10.6, 1],
  [CANOPY.length, 9.2],
];
const radiusAt = (s: number) => {
  for (let i = 1; i < CANOPY_PROFILE.length; i++) {
    const [s1, r1] = CANOPY_PROFILE[i]!;
    const [s0, r0] = CANOPY_PROFILE[i - 1]!;
    if (s <= s1) return r0 + ((r1 - r0) * (s - s0)) / (s1 - s0);
  }
  return CANOPY_PROFILE.at(-1)![1];
};

export const CANOPY_ART = {
  shell: G.solidOf(
    CANOPY_PROFILE.map(([s, r, smooth]) => (smooth ? [s, r, 1] : [s, r]) as [number, number]),
    NOSE,
    P,
  ),
  // The painted band where the windscreen ends, and the two mounting grommets.
  seams: join([15, 23].map((s) => G.arcOf(NOSE, s, radiusAt(s), P))),
  grommets: dots(
    [Math.PI / 2 - 0.25, Math.PI / 2 + 0.25].map((angle) =>
      G.pointOf(NOSE, CANOPY.length - 6, radiusAt(CANOPY.length - 6), angle),
    ),
  ),
};

/** How many solids the figure is built from, counted from the parts above. */
export const PART_COUNT =
  9 + // stand
  12 + // skids
  18 + // tail
  10 + // frame
  4 + // motor
  14 + // servos
  13 + // swashplate
  13 + // head
  2 + // blades
  3 + // battery
  3 + // electronics
  1; // canopy
