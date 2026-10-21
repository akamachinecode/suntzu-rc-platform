import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A short-course truck's drivetrain on a bench, in millimetres: the transmission in the
 * middle, the motor on its plate with the pinion and spur on the near side (+y), and one
 * rear wheel on the far side. Shafts run along y; z is up from the base.
 */

export const WIDTH = 640;
export const HEIGHT = 430;
export const AZIMUTH = 50;

export const BASE: Plan = { x: -66, y: -98, w: 112, d: 124, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

/* Transmission: input (spur) shaft above and behind the output (wheel) shaft. */
export const CASE: Plan = { x: -34, y: -16, w: 50, d: 20, r: 6 };
export const CASE_Z = { z0: 34, z1: 78 };
export const OUTPUT = { x: 0, z: 62 };
export const INPUT = { x: -14, z: 74 };
export const PLATE_Y = 4; // the motor plate's inner face
export const SPUR_Y = { y0: 9, y1: 13 };
export const MOTOR = { r: 18, length: 50, angle: 62 }; // angle of the motor above the spur, degrees

/* The rear wheel on the far side, on a 110 mm tyre. */
export const WHEEL = { y0: -40, y1: -87, r: 55 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [OUTPUT.x, WHEEL.y1, OUTPUT.z + WHEEL.r],
    [OUTPUT.x, WHEEL.y0, OUTPUT.z - WHEEL.r],
    [INPUT.x - 40, PLATE_Y, INPUT.z + 64],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
