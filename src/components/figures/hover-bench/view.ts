import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A hover bench, in units of 4 mm: a bench scale with a 450 strapped to its platform.
 * The main shaft is the z axis; x points at the nose. z is up from the base's top.
 */

export const WIDTH = 640;
export const HEIGHT = 440;
export const AZIMUTH = 52;

export const BASE: Plan = { x: -150, y: -60, w: 214, d: 120, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

/* The scale: a load-cell box, a platform on top, a display on a stalk. */
export const CELL: Plan = { x: -16, y: -12, w: 32, d: 24, r: 2 };
export const CELL_H = 6;
export const PLATFORM: Plan = { x: -30, y: -22, w: 60, d: 44, r: 3 };
export const PLATFORM_Z = CELL_H;
export const PLATFORM_H = 2;
export const DECK = PLATFORM_Z + PLATFORM_H; // the skids rest here
export const DISPLAY: Plan = { x: 30, y: 30, w: 26, d: 16, r: 2 };
export const DISPLAY_H = 12;

/* The helicopter on it, skids at DECK. */
export const SKID_Y = 16;
export const FRAME = { x0: -20, x1: 26, y: 7, z0: 14, z1: 46 };
export const HEAD_Z = 66;
export const SHAFT_TOP = 70;
export const BLADE_R = 90; // 721 mm rotor
export const BOOM = { from: -20, to: -128, z: 32, r: 1.5 };
export const TAIL_X = -126;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [BLADE_R, 0, DECK + HEAD_Z + 4],
    [-BLADE_R, 0, DECK + HEAD_Z + 4],
    [0, BLADE_R, DECK + HEAD_Z + 4],
    [0, -BLADE_R, DECK + HEAD_Z + 4],
    [TAIL_X, 0, DECK + BOOM.z + 14],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
