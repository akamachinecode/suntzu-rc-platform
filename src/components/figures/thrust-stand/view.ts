import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A thrust stand on the bench, in units of 2 mm. The motor's axis runs along +x,
 * so the prop disc stands in the y–z plane. z is up from the base plate's top.
 */

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 52;

export const BASE: Plan = { x: -112, y: -62, w: 214, d: 124, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

/* The lever: a post that pivots about y at PIVOT_Z, motor on top, a foot that presses the load cell. */
export const RISER: Plan = { x: -32, y: -16, w: 24, d: 32, r: 2 };
export const RISER_H = 28;
export const PIVOT_X = -20;
export const PIVOT_Z = 36;
export const ARM: Plan = { x: PIVOT_X - 4, y: -4, w: 8, d: 8, r: 1 };
export const ARM_TOP = 118;
export const AXIS_Z = 108; // thrust line
export const LEVER_END = 44;
export const CELL: Plan = { x: 30, y: -6, w: 36, d: 12, r: 1 };
export const CELL_Z = 22;

/* Motor and prop: a 28 mm outrunner and a 254 mm prop. */
export const MOUNT_X = PIVOT_X + 4;
export const MOTOR_R = 7;
export const MOTOR_LEN = 15;
export const PROP_X = MOUNT_X + 2 + MOTOR_LEN + 4;
export const PROP_R = 63.5;

/* Bench electronics. */
export const BATTERY: Plan = { x: -100, y: -56, w: 50, d: 22, r: 2 };
export const BATTERY_H = 13;
export const METER: Plan = { x: -104, y: 22, w: 34, d: 30, r: 2 };
export const METER_H = 14;
export const ESC: Plan = { x: -60, y: 8, w: 22, d: 14, r: 1.5 };
export const ESC_H = 7;
export const TESTER: Plan = { x: 34, y: -56, w: 32, d: 22, r: 2 };
export const TESTER_H = 10;
export const DISPLAY: Plan = { x: 50, y: 24, w: 40, d: 30, r: 2 };
export const DISPLAY_H = 18;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [PROP_X, -PROP_R, AXIS_Z],
    [PROP_X, PROP_R, AXIS_Z],
    [PROP_X, 0, AXIS_Z + PROP_R],
    [PIVOT_X, 0, ARM_TOP + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
