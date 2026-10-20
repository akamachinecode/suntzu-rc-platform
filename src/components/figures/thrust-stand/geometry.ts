import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  knurl,
  onTop,
  planOutline,
  ring,
  segment,
  sideMatrix,
  sideSeam,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import {
  ARM,
  ARM_TOP,
  AXIS_Z,
  BASE,
  BASE_H,
  BATTERY,
  BATTERY_H,
  CELL,
  CELL_Z,
  DISPLAY,
  DISPLAY_H,
  ESC,
  ESC_H,
  FOOT_H,
  LEVER_END,
  METER,
  METER_H,
  MOTOR_LEN,
  MOTOR_R,
  MOUNT_X,
  P,
  PIVOT_X,
  PIVOT_Z,
  PROP_R,
  PROP_X,
  RISER,
  RISER_H,
  TESTER,
  TESTER_H,
  at,
} from "./view";

type Vec = [number, number, number];
const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const box = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) =>
  slabOf(plan, z, h, P, steps, bevel);
const pathOf = (points: Point3[]) =>
  `M${points
    .map(at)
    .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("L")}`;

/** Points along a cubic Bézier, for leads that sag between their ends. */
function sag(a: Vec, b: Vec, c: Vec, d: Vec, steps = 12): Point3[] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
    return [0, 1, 2].map(
      (i) => k[0] * a[i]! + k[1] * b[i]! + k[2] * c[i]! + k[3] * d[i]!,
    ) as Point3;
  });
}

/** Rule lines that stand for printed text on a top face. */
function rules(plan: Plan, z: number, inset = 3) {
  return join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [plan.x + inset, plan.y + inset + row * 2.2],
          [
            plan.x + inset + (row === 1 ? plan.w * 0.35 : plan.w * 0.55),
            plan.y + inset + row * 2.2,
          ],
        ],
        z,
        P,
      ),
    ),
  );
}

/* ---------------------------------------------------------------- base */

const LABEL: Plan = { x: BASE.x + 10, y: BASE.y + BASE.d - 16, w: 40, d: 9, r: 1.5 };

export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 18).map(([x, y]) => cylinder(x, y, 6, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  slab: box(BASE, -BASE_H, BASE_H, 8, 1.4),
  groove: planOutline(insetPlan(BASE, 4.5), 0, P),
  screwRings: join(corners(BASE, 8).map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: dots(corners(BASE, 8).map(([x, y]) => [x, y, 0])),
  label: box(LABEL, 0, 0.8, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.8, P),
  labelRule: rules(insetPlan(LABEL, 1.4), 0.8, 2.6),
};

/* --------------------------------------------------------------- lever */

const BLOCKS: Plan[] = [-1, 1].map((side) => ({
  x: PIVOT_X - 7,
  y: side > 0 ? 6 : -12,
  w: 14,
  d: 6,
  r: 1,
}));
const SHAFT = G.frameAlong([PIVOT_X, -14, PIVOT_Z], Y);

const pillow = (plan: Plan) => ({
  block: box(plan, RISER_H, PIVOT_Z + 6 - RISER_H, 3, 0.4),
  bore: G.circleOf(G.frameAlong([PIVOT_X, plan.y + plan.d, PIVOT_Z], Y), 0, 3.2, P, 24),
  screws: dots([
    [plan.x + 2.4, plan.y + plan.d / 2, PIVOT_Z + 6],
    [plan.x + plan.w - 2.4, plan.y + plan.d / 2, PIVOT_Z + 6],
  ]),
});

export const LEVER_BACK = {
  riser: box(RISER, 0, RISER_H, 4, 0.6),
  riserSeam: sideSeam(RISER, 8, P, 4),
  riserScrews: dots(corners(RISER, 3).map(([x, y]) => [x, y, RISER_H])),
  far: pillow(BLOCKS[0]!),
  shaft: G.disc(0, 28, 1.6, SHAFT, P),
};

export const LEVER = {
  arm: box(ARM, PIVOT_Z - 4, ARM_TOP - PIVOT_Z + 4, 2, 0.4),
  armLine: segment(
    [ARM.x + ARM.w, ARM.y + ARM.d, PIVOT_Z - 4],
    [ARM.x + ARM.w, ARM.y + ARM.d, ARM_TOP],
    P,
  ),
  foot: box(
    { x: PIVOT_X - 4, y: -3, w: LEVER_END - PIVOT_X + 6, d: 6, r: 1 },
    PIVOT_Z - 4,
    4,
    2,
    0.3,
  ),
  button: cylinder(LEVER_END, 0, 2.4, CELL_Z + 8, PIVOT_Z - 4 - CELL_Z - 8, P, 16),
  near: pillow(BLOCKS[1]!),
};

/* ----------------------------------------------------------- load cell */

const PEDESTAL: Plan = { x: CELL.x + CELL.w - 14, y: -9, w: 14, d: 18, r: 1.5 };
const GAUGES: Plan[] = [0, 1].map((index) => ({
  x: CELL.x + 8 + index * 9,
  y: -3,
  w: 6,
  d: 6,
  r: 0.6,
}));

export const CELL_ART = {
  pedestal: box(PEDESTAL, 0, CELL_Z, 3, 0.5),
  bar: box(CELL, CELL_Z, 8, 2, 0.4),
  hole: G.circleOf(G.frameAlong([CELL.x + 14, CELL.y + CELL.d, CELL_Z + 4], Y), 0, 2.4, P, 24),
  gauges: join(GAUGES.map((plan) => planOutline(plan, CELL_Z + 8, P, 2))),
  bolts: dots([
    [CELL.x + CELL.w - 4, -3, CELL_Z + 8],
    [CELL.x + CELL.w - 4, 3, CELL_Z + 8],
  ]),
};

/* ------------------------------------------------------- motor and hub */

const AXIS = G.frameOf([MOUNT_X, 0, AXIS_Z], X, Y, [0, 0, 1]);
export const NOSE_AT = MOUNT_X + 2 + MOTOR_LEN;

export const MOTOR_ART = {
  mount: G.prismOf(
    AXIS,
    [
      [-11, -11],
      [11, -11],
      [11, 11],
      [-11, 11],
    ],
    0,
    2,
    P,
  ),
  mountScrews: dots(
    [
      [-8, -8],
      [8, -8],
      [8, 8],
      [-8, 8],
    ].map(([y, z]) => [MOUNT_X + 2, y!, AXIS_Z + z!] as Point3),
  ),
  stator: G.disc(2, 4, MOTOR_R - 1.6, AXIS, P),
  can: G.solidOf(
    [
      [4, MOTOR_R - 0.4],
      [4.6, MOTOR_R, 1],
      [2 + MOTOR_LEN - 0.8, MOTOR_R, 1],
      [2 + MOTOR_LEN, MOTOR_R - 0.8],
    ],
    AXIS,
    P,
  ),
  canSeam: G.arcOf(AXIS, 9, MOTOR_R, P),
  adapter: G.disc(2 + MOTOR_LEN, PROP_X - MOUNT_X - 1, 2.4, AXIS, P),
  hub: G.disc(PROP_X - MOUNT_X - 1.2, PROP_X - MOUNT_X + 1.2, 4, AXIS, P),
  nut: G.solidOf(
    [
      [PROP_X - MOUNT_X + 1.2, 3.4],
      [PROP_X - MOUNT_X + 3.4, 3, 1],
      [PROP_X - MOUNT_X + 6, 1.4, 1],
      [PROP_X - MOUNT_X + 6.6, 0.4, 1],
    ],
    AXIS,
    P,
  ),
};

/** The prop's disc as it looks spinning: a pale ellipse that fills in as rpm rises. */
export const PROP_DISC = G.circleOf(G.frameAlong([PROP_X, 0, AXIS_Z], X), 0, PROP_R, P, 96) + "Z";

/* ----------------------------------------------------- bench electronics */

const STRAP_X = BATTERY.x + BATTERY.w / 2;
export const BATTERY_ART = {
  pack: box(BATTERY, 0, BATTERY_H, 3, 0.6),
  strap: box(
    { x: STRAP_X - 3, y: BATTERY.y - 0.6, w: 6, d: BATTERY.d + 1.2, r: 0.6 },
    0,
    BATTERY_H + 0.6,
    2,
  ),
  label: rules(
    { x: BATTERY.x + 2, y: BATTERY.y + 2, w: STRAP_X - BATTERY.x - 6, d: 10, r: 0 },
    BATTERY_H,
    2,
  ),
  balance: box({ x: BATTERY.x + BATTERY.w, y: BATTERY.y + 3, w: 4, d: 5, r: 0.6 }, 3, 3, 2),
};

/** A display window on the +y face of a box, with the text frame for its digits. */
function windowOn(plan: Plan, h: number, from: number, width: number) {
  const y = plan.y + plan.d + 0.05;
  const x0 = plan.x + from;
  const z0 = 3;
  const z1 = h - 3;
  return {
    outline: pathOf([
      [x0, y, z0],
      [x0 + width, y, z0],
      [x0 + width, y, z1],
      [x0, y, z1],
      [x0, y, z0],
    ]),
    text: (row: number, rows: number) =>
      sideMatrix([x0 + 2, y], z1 - ((z1 - z0) * (row + 0.78)) / rows, P, "left"),
  };
}

const METER_WINDOW = windowOn(METER, METER_H, 4, 26);
export const METER_ART = {
  case: box(METER, 0, METER_H, 3, 0.6),
  window: METER_WINDOW.outline,
  amps: METER_WINDOW.text(0, 2),
  watts: METER_WINDOW.text(1, 2),
  rule: rules(insetPlan(METER, 2), METER_H, 3),
};

export const ESC_ART = {
  case: box(ESC, 0, ESC_H, 2, 0.4),
  fins: join(
    Array.from({ length: 6 }, (_, index) => {
      const x = ESC.x + ((index + 1) * ESC.w) / 7;
      return onTop(
        [
          [x, ESC.y],
          [x, ESC.y + ESC.d],
        ],
        ESC_H,
        P,
      );
    }),
  ),
};

const KNOB_AT: [number, number] = [TESTER.x + TESTER.w - 10, TESTER.y + TESTER.d / 2];
export const KNOB = { x: KNOB_AT[0], y: KNOB_AT[1], z: TESTER_H + 6, r: 5 };
export const TESTER_ART = {
  case: box(TESTER, 0, TESTER_H, 3, 0.5),
  leds: dots(
    [0, 1, 2].map((index) => [TESTER.x + 5 + index * 4, TESTER.y + 5, TESTER_H] as Point3),
  ),
  ledRings: join(
    [0, 1, 2].map((index) => ring(TESTER.x + 5 + index * 4, TESTER.y + 5, 1.3, TESTER_H, P, 12)),
  ),
  rule: rules({ x: TESTER.x + 2, y: TESTER.y + 9, w: 14, d: 8, r: 0 }, TESTER_H, 1.6),
  neck: cylinder(KNOB_AT[0], KNOB_AT[1], 2, TESTER_H, 2, P, 16),
  knob: cylinder(KNOB_AT[0], KNOB_AT[1], KNOB.r, TESTER_H + 2, 4, P, 32),
  knurl: knurl(KNOB_AT[0], KNOB_AT[1], KNOB.r, TESTER_H + 2, TESTER_H + 6, 30, P),
  // A printed dial ring around the knob: the scale ticks hang off it.
  dial: ring(KNOB_AT[0], KNOB_AT[1], KNOB.r + 1.2, TESTER_H, P, 40),
  scale: join(
    Array.from({ length: 11 }, (_, index) => {
      // 270° of knob travel, from 7:30 to 4:30 on a clock face, on the case top around the knob.
      const angle = ((-135 + index * 27) * Math.PI) / 180;
      const r0 = KNOB.r + 1.2;
      const r1 = KNOB.r + (index % 5 === 0 ? 3.2 : 2.2);
      return onTop(
        [
          [KNOB_AT[0] + Math.sin(angle) * r0, KNOB_AT[1] - Math.cos(angle) * r0],
          [KNOB_AT[0] + Math.sin(angle) * r1, KNOB_AT[1] - Math.cos(angle) * r1],
        ],
        TESTER_H,
        P,
      );
    }),
  ),
};

const DISPLAY_WINDOW = windowOn(DISPLAY, DISPLAY_H, 5, 30);
export const DISPLAY_ART = {
  case: box(DISPLAY, 0, DISPLAY_H, 3, 0.6),
  window: DISPLAY_WINDOW.outline,
  grams: DISPLAY_WINDOW.text(0, 1),
  buttons: [0, 1].map((index) =>
    cylinder(DISPLAY.x + 8 + index * 8, DISPLAY.y + 8, 2, DISPLAY_H, 1.2, P, 16),
  ),
  rule: rules({ x: DISPLAY.x + 22, y: DISPLAY.y + 4, w: 16, d: 8, r: 0 }, DISPLAY_H, 1.6),
};

/* --------------------------------------------------------------- leads */

const BENCH = 0.4;

/** A lead: its sagging path, and a terminal dot where each end lands on a part. */
function lead(points: Point3[]) {
  return { d: pathOf(points), ends: dots([points[0]!, points.at(-1)!]) };
}

export const CABLES = {
  // Battery to wattmeter, along the bench.
  pack: lead(
    sag(
      [BATTERY.x + 22, BATTERY.y + BATTERY.d, 5],
      [BATTERY.x + 22, BATTERY.y + BATTERY.d + 8, BENCH],
      [METER.x + 20, METER.y - 12, BENCH],
      [METER.x + 20, METER.y, 5],
      14,
    ),
  ),
  // Wattmeter to speed controller.
  meter: lead(
    sag(
      [METER.x + METER.w, METER.y + 8, 5],
      [METER.x + METER.w + 6, METER.y + 8, BENCH],
      [ESC.x - 6, ESC.y + 7, BENCH],
      [ESC.x, ESC.y + 7, 4],
    ),
  ),
  // Three motor wires, hanging in a loop from the controller up to the back of the motor.
  motor: lead(
    sag(
      [ESC.x + ESC.w, ESC.y + 7, 4],
      [ESC.x + ESC.w + 18, ESC.y + 7, 10],
      [MOUNT_X - 4, 12, AXIS_Z - 30],
      [MOUNT_X, 9, AXIS_Z - 6],
      18,
    ),
  ),
  // Signal lead from the servo tester to the controller, under everything.
  signal: lead(
    sag(
      [TESTER.x, TESTER.y + 8, 4],
      [TESTER.x - 30, TESTER.y + 8, BENCH],
      [ESC.x + 6, ESC.y - 26, BENCH],
      [ESC.x + 6, ESC.y, 3],
      18,
    ),
  ),
  // Load cell to its display.
  cell: lead(
    sag(
      [CELL.x + CELL.w, CELL.y + CELL.d - 2, CELL_Z + 3],
      [CELL.x + CELL.w + 8, CELL.y + CELL.d, CELL_Z],
      [DISPLAY.x + 22, DISPLAY.y - 10, BENCH],
      [DISPLAY.x + 22, DISPLAY.y, 5],
      14,
    ),
  ),
};

/** The lever's gain: the cell sits closer to the pivot than the thrust line does. */
export const LEVER_RATIO = (AXIS_Z - PIVOT_Z) / (LEVER_END - PIVOT_X);
