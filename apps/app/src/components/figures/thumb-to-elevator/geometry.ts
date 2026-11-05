import {
  corners,
  cylinder,
  depthOf,
  haloOf,
  insetPlan,
  knurl,
  onTop,
  planOutline,
  ring,
  segment,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { HINGE, SPLINE } from "./model";
import {
  ANTENNA,
  ARM_Y,
  BASE,
  BASE_H,
  BLOCK_H,
  BLOCKS,
  CLAMP,
  FOOT_H,
  GIMBAL,
  GIMBAL_H,
  KNOB,
  LABEL,
  P,
  PAD_H,
  PAD_PLAN,
  PANEL_TOP,
  PIVOT,
  PLUG,
  POST,
  POST_H,
  RX,
  RX_H,
  RX_TOP,
  SERVO,
  SERVO_H,
  SERVO_TOP,
  SERVO_Z,
  SLOT,
  STAB_HALF,
  STAB_LE,
  STAB_Y0,
  STAB_Y1,
  STRIP,
  TAB_Y,
  at,
} from "./view";

const solid = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) =>
  slabOf(plan, z, h, P, steps, bevel);
const post = (x: number, y: number, r: number, z: number, h: number, steps = 24) =>
  cylinder(x, y, r, z, h, P, steps);
const dots = (points: Point3[]): Flat[] => points.map(at);
const byDepth = (points: Plane[]) =>
  [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const join = (paths: string[]) => paths.join("");
const lift = (points: Plane[], z: number): Point3[] => points.map(([x, y]) => [x, y, z]);

/* Base board on four feet, with a groove, corner screws, a ruler strip and a label plate. */

const BASE_TOP = 0;
const FEET = byDepth(corners(BASE, 24));
const BASE_SCREWS = corners(BASE, 9);
const STRIP_TICKS = topTicks(
  STRIP.x + 3,
  STRIP.x + STRIP.w - 3,
  5,
  5,
  STRIP.y + 0.6,
  0.6,
  [2, 3.6],
  P,
);

export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: FEET.map(([x, y]) => [
    post(x, y, 8, -BASE_H - FOOT_H, 1.6, 28),
    post(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28),
  ]),
  slab: solid(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), BASE_TOP, P),
  screwRings: join(BASE_SCREWS.map(([x, y]) => ring(x, y, 2.4, BASE_TOP, P, 16))),
  screws: dots(lift(BASE_SCREWS, BASE_TOP)),
  strip: solid(STRIP, BASE_TOP, 0.6, 2),
  stripMinor: STRIP_TICKS.minor,
  stripMajor: STRIP_TICKS.major,
  label: solid(LABEL, BASE_TOP, 0.8, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [LABEL.x + 8, LABEL.y + 3.6 + row * 2.4],
          [LABEL.x + (row === 1 ? 28 : 38), LABEL.y + 3.6 + row * 2.4],
        ],
        0.8,
        P,
      ),
    ),
  ),
  labelScrews: dots([
    [LABEL.x + 3.6, LABEL.y + LABEL.d / 2, 0.8],
    [LABEL.x + LABEL.w - 3.6, LABEL.y + LABEL.d / 2, 0.8],
  ]),
};

/* Bench clamp holding the far end of the stabiliser. Lower half sits under the stab, upper half on it. */

const CLAMP_FOOT = insetPlan(CLAMP, -3);
const JAW = insetPlan(CLAMP, -2);
const STAB_BOTTOM = HINGE.z - STAB_HALF;
const STAB_TOP = HINGE.z + STAB_HALF;
const JAW_H = 6;
const SPACER: Plan = { x: JAW.x, y: JAW.y, w: JAW.w, d: 8, r: 1 };

export const CLAMP_LOW = {
  foot: solid(CLAMP_FOOT, 0, 2.4, 3),
  footScrews: dots(lift(corners(CLAMP_FOOT, 2.2), 2.4)),
  tower: solid(CLAMP, 2.4, STAB_BOTTOM - 4 - 2.4, 4, 0.6),
  towerSeam: sideSeam(CLAMP, 30, P, 4),
  jaw: solid(JAW, STAB_BOTTOM - 4, 4, 3, 0.4),
  spacer: solid(SPACER, STAB_BOTTOM, STAB_TOP - STAB_BOTTOM, 3),
};

export const CLAMP_HIGH = {
  jaw: solid(JAW, STAB_TOP, JAW_H, 3, 0.6),
  jawScrews: dots([
    [JAW.x + 4, JAW.y + 4, STAB_TOP + JAW_H],
    [JAW.x + JAW.w - 4, JAW.y + 4, STAB_TOP + JAW_H],
  ]),
  neck: post(KNOB[0], KNOB[1], 2.2, STAB_TOP + JAW_H, 3, 16),
  knob: post(KNOB[0], KNOB[1], 6, STAB_TOP + JAW_H + 3, 6, 40),
  knobKnurl: knurl(KNOB[0], KNOB[1], 6, STAB_TOP + JAW_H + 3, STAB_TOP + JAW_H + 9, 40, P),
  knobRing: ring(KNOB[0], KNOB[1], 3.6, STAB_TOP + JAW_H + 9, P, 28),
  knobDot: dots([[KNOB[0], KNOB[1], STAB_TOP + JAW_H + 9]]),
};

/* Transmitter gimbal module: housing, face panel, stick slot with a scale, power switch and antenna. */

const PANEL = insetPlan(GIMBAL, 3);
const SCALE: Plan = { x: SLOT.x, y: SLOT.y + SLOT.d + 2.4, w: SLOT.w, d: 3.2, r: 0.6 };
const SCALE_TOP = PANEL_TOP + 0.4;
const SWITCH: Plane = [GIMBAL.x + GIMBAL.w - 12, GIMBAL.y + GIMBAL.d - 10];
const ANTENNA_BASE = PANEL_TOP;
const WHIP_TOP = 62;

function scaleTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  for (let step = -5; step <= 5; step++) {
    const x = PIVOT[0] + step * 3;
    const big = step % 5 === 0;
    (big ? major : minor).push(
      onTop(
        [
          [x, SCALE.y + 0.4],
          [x, SCALE.y + 0.4 + (big ? 2.4 : 1.4)],
        ],
        SCALE_TOP,
        P,
      ),
    );
  }
  return { minor: join(minor), major: join(major) };
}

const SCALE_TICKS = scaleTicks();
const WHIP = G.frameAlong([ANTENNA[0], ANTENNA[1], 0], [0, 0, 1]);

export const GIMBAL_ART = {
  housing: solid(GIMBAL, 0, GIMBAL_H, 6, 1),
  housingSeam: sideSeam(GIMBAL, 8, P, 6),
  panel: solid(PANEL, GIMBAL_H, 1.2, 5, 0.4),
  panelScrews: dots(lift(corners(PANEL, 3), PANEL_TOP)),
  slot: planOutline(SLOT, PANEL_TOP, P, 6),
  slotInner: planOutline(insetPlan(SLOT, 1.2), PANEL_TOP, P, 6),
  scale: solid(SCALE, PANEL_TOP, 0.4, 2),
  scaleMinor: SCALE_TICKS.minor,
  scaleMajor: SCALE_TICKS.major,
  switchRing: ring(SWITCH[0], SWITCH[1], 2.8, PANEL_TOP, P, 20),
  switchLever: post(SWITCH[0], SWITCH[1], 0.9, PANEL_TOP, 5, 12),
  switchTip: post(SWITCH[0], SWITCH[1], 1.4, PANEL_TOP + 5, 1.6, 16),
  antennaBase: post(ANTENNA[0], ANTENNA[1], 3.4, ANTENNA_BASE, 5, 28),
  antennaKnurl: knurl(ANTENNA[0], ANTENNA[1], 3.4, ANTENNA_BASE, ANTENNA_BASE + 5, 28, P),
  whip: G.solidOf(
    [
      [ANTENNA_BASE + 5, 1.3],
      [WHIP_TOP, 1.1],
    ],
    WHIP,
    P,
  ),
  whipSeam: G.arcOf(WHIP, ANTENNA_BASE + 20, 1.25, P),
  tip: G.sphereOf([ANTENNA[0], ANTENNA[1], WHIP_TOP + 1.2], 1.9, P),
};

/* Receiver on a foam pad, with a lid seam, label inlay, bind button, status LED and the servo plug. */

const RX_LABEL = insetPlan(RX, 3.5);
const BIND: Plane = [RX.x + 6, RX.y + RX.d - 7];
export const LED: Point3 = [RX.x + RX.w - 6, RX.y + RX.d - 7, RX_TOP];
const PLUG_Z = PAD_H + 2;
const PLUG_H = 7;
export const PLUG_FACE: Point3 = [PLUG.x + PLUG.w, PLUG.y + PLUG.d / 2, PLUG_Z + PLUG_H / 2];

export const RX_ART = {
  pad: solid(PAD_PLAN, 0, PAD_H, 4),
  case: solid(RX, PAD_H, RX_H, 4, 0.6),
  caseSeam: sideSeam(RX, PAD_H + 4, P, 4),
  label: planOutline(RX_LABEL, RX_TOP, P, 3),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [RX_LABEL.x + 3, RX_LABEL.y + 3 + row * 2.6],
          [RX_LABEL.x + (row === 2 ? 12 : 19), RX_LABEL.y + 3 + row * 2.6],
        ],
        RX_TOP,
        P,
      ),
    ),
  ),
  bind: post(BIND[0], BIND[1], 1.7, RX_TOP, 1, 16),
  bindRing: ring(BIND[0], BIND[1], 2.6, RX_TOP, P, 18),
  ledRing: ring(LED[0], LED[1], 1.6, RX_TOP, P, 16),
  led: dots([LED]),
  plug: solid(PLUG, PLUG_Z, PLUG_H, 2, 0.3),
  plugSeam: sideSeam(PLUG, PLUG_Z + 2.4, P, 2),
};

/* Wires lying on the bench: two receiver antennas and the servo lead. Each ends on a part or a terminal. */

/** Points along a cubic Bézier, for leads that sag between their ends. */
function sag(a: Point3, b: Point3, c: Point3, d: Point3, steps = 10): Point3[] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
    return [0, 1, 2].map(
      (axis) => k[0] * a[axis]! + k[1] * b[axis]! + k[2] * c[axis]! + k[3] * d[axis]!,
    ) as Point3;
  });
}

const BENCH = 0.4;
const SERVO_EXIT: Point3 = [SERVO.x, -4, SERVO_Z + 3];

export const LEADS = {
  // Each antenna starts inside the case, so its root sits under the case's fill.
  antennaA: [
    at([RX.x + 14, RX.y + 2, PAD_H + 7]),
    at([RX.x + 14, RX.y - 7, BENCH]),
    at([RX.x + 14, RX.y - 34, BENCH]),
  ] as Flat[],
  antennaB: [
    at([RX.x + 2, RX.y + 8, PAD_H + 7]),
    at([RX.x - 8, RX.y + 8, BENCH]),
    at([RX.x - 10, RX.y + 36, BENCH]),
  ] as Flat[],
  // The lead leaves the servo's end, droops onto the bench in front of the post, and rises into the plug.
  servo: [
    ...sag(
      SERVO_EXIT,
      [SERVO_EXIT[0] - 10, SERVO_EXIT[1], SERVO_EXIT[2]],
      [-14, -5, BENCH],
      [-18, -8, BENCH],
    ),
    ...sag(
      [-21, -13, BENCH],
      [-23, PLUG_FACE[1], BENCH],
      [PLUG_FACE[0] + 6, PLUG_FACE[1], PLUG_FACE[2]],
      PLUG_FACE,
    ),
  ].map(at),
};

/* Servo on two mounting posts: rubber grommets and screws through its tabs, output spline facing out. */

const TABS: Plan[] = [
  { x: SERVO.x - 10, y: TAB_Y, w: 10, d: 2, r: 0.4 },
  { x: SERVO.x + SERVO.w, y: TAB_Y, w: 10, d: 2, r: 0.4 },
];
const GROMMETS: Point3[] = TABS.flatMap((tab) =>
  [SERVO_Z + 5, SERVO_TOP - 5].map((z) => [tab.x + tab.w / 2, TAB_Y + 2, z] as Point3),
);
const SPLINE_AXIS = G.frameAlong([SPLINE.x, 0, SPLINE.z], [0, 1, 0]);
const SEAM_YS = [-6, -32];

export const BLOCK_ART = BLOCKS.map((block) => {
  const foot = insetPlan(block, -2.5);
  return {
    foot: solid(foot, 0, 2, 2),
    footScrews: dots([
      [foot.x + 2, foot.y + foot.d / 2, 2],
      [foot.x + foot.w - 2, foot.y + foot.d / 2, 2],
    ]),
    block: solid(block, 2, BLOCK_H - 2, 3, 0.5),
    topScrew: dots([[block.x + block.w / 2, block.y + 4, BLOCK_H]]),
  };
});

export const SERVO_ART = {
  tabs: TABS.map((tab) => solid(tab, SERVO_Z + 1, SERVO_H - 2, 2)),
  grommets: GROMMETS.map((point) => G.disc(0, 1.4, 2.4, G.frameAlong(point, [0, 1, 0]), P)),
  eyelets: join(
    GROMMETS.map((point) => G.circleOf(G.frameAlong(point, [0, 1, 0]), 1.4, 1.1, P, 16)),
  ),
  screws: dots(GROMMETS.map(([x, y, z]) => [x, y + 1.4, z])),
  case: solid(SERVO, SERVO_Z, SERVO_H, 3, 0.6),
  seams: join([
    ...SEAM_YS.map((y) =>
      onTop(
        [
          [SERVO.x, y],
          [SERVO.x + SERVO.w, y],
        ],
        SERVO_TOP,
        P,
      ),
    ),
    ...SEAM_YS.map((y) =>
      segment([SERVO.x + SERVO.w, y, SERVO_TOP], [SERVO.x + SERVO.w, y, SERVO_Z], P),
    ),
  ]),
  label: topMatrix([SERVO.x + SERVO.w / 2, -19], SERVO_TOP, P),
  boss: G.disc(0, 1.2, 5.6, SPLINE_AXIS, P),
  spline: G.disc(1.2, ARM_Y, 3.2, SPLINE_AXIS, P),
  splineRing: G.circleOf(SPLINE_AXIS, 1.2, 4.3, P, 32),
};

/* Tail section. The stab is a flat plate with a round leading edge, cut off at the hinge line. */

export const STAB_FRAME = G.frameOf([HINGE.x, 0, HINGE.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const LE_R = STAB_HALF;
const LE_U = STAB_LE - HINGE.x + LE_R;
const STAB_SECTION: Plane[] = [
  ...Array.from({ length: 13 }, (_, step) => {
    const angle = Math.PI / 2 + (step / 12) * Math.PI;
    return [LE_U + LE_R * Math.cos(angle), LE_R * Math.sin(angle)] as Plane;
  }),
  [-0.8, -STAB_HALF],
  [-0.8, STAB_HALF],
];
const SPAR_X = HINGE.x - 32;
const HINGES = [-50, -26, -2];

export const STAB_ART = {
  plate: G.prismOf(STAB_FRAME, STAB_SECTION, STAB_Y0, STAB_Y1, P),
  spar: onTop(
    [
      [SPAR_X, STAB_Y0],
      [SPAR_X, STAB_Y1],
    ],
    STAB_TOP,
    P,
  ),
  hinges: join(
    HINGES.map((y) =>
      planOutline({ x: HINGE.x - 6, y: y - 5, w: 4.6, d: 10, r: 1 }, STAB_TOP, P, 3),
    ),
  ),
};

/* Ruler post beside the trailing edge: millimetre ticks on its front face, zero at the hinge height. */

const POST_FOOT = insetPlan(POST, -2.5);
const POST_FACE = POST.y + POST.d;

function postTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  let zero = "";
  for (let mm = -16; mm <= 16; mm += 2) {
    const z = HINGE.z + mm;
    const length = mm % 10 === 0 ? 3.8 : 2.2;
    const tick = segment([POST.x, POST_FACE, z], [POST.x + length, POST_FACE, z], P);
    if (mm === 0) zero = tick;
    else (mm % 10 === 0 ? major : minor).push(tick);
  }
  return { minor: join(minor), major: join(major), zero };
}

const POST_TICKS = postTicks();

export const POST_ART = {
  foot: solid(POST_FOOT, 0, 2, 2),
  footScrews: dots([
    [POST_FOOT.x + 2, POST_FOOT.y + POST_FOOT.d / 2, 2],
    [POST_FOOT.x + POST_FOOT.w - 2, POST_FOOT.y + POST_FOOT.d / 2, 2],
  ]),
  post: solid(POST, 2, POST_H - 2, 2, 0.4),
  cap: solid(insetPlan(POST, -0.6), POST_H, 1.6, 2, 0.3),
  minor: POST_TICKS.minor,
  major: POST_TICKS.major,
  zero: POST_TICKS.zero,
};
