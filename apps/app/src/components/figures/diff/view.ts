import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A rear axle on a bench, in world units of about 2 mm, with the differential drawn larger
 * than life so its gears show. The axle runs along y (+y is the truck's left), z is up, and
 * the input pinion comes in from behind (−x).
 */

export const WIDTH = 640;
export const HEIGHT = 330;
export const AZIMUTH = 24;
export const ELEVATION = 26;

export const AXLE_Z = 40;
export const BASE: Plan = { x: -40, y: -100, w: 80, d: 200, r: 8 };
export const BASE_H = 7;
export const FOOT_H = 4;

/* The differential: ring gear (far), a bridge across the near side, side gears, cross pin, spiders. */
export const RING = { y0: -21, y1: -17, r: 24 };
export const PLATE = { y0: 16, y1: 19, r: 5.5 };
export const POST_R = 15;
export const SIDE = { at: 11, r: 8 }; // side gears' faces sit at y = ±(SIDE.at − 3)
export const SPIDER = { at: 6.5, r: 5.6, len: 4 };

/* Shafts, bearings, wheels. */
export const SHAFT_R = 2.4;
export const PILLOW_Y = 44;
export const WHEEL = { y0: 70, y1: 90, r: 26 };

/* The drive coming in from behind: pinion, shaft, a motor standing in for the gearbox. */
export const PINION = { x: -16, y: -25, r: 6 };
export const MOTOR = { x0: -66, x1: -48, r: 8 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [0, WHEEL.y1, AXLE_Z + WHEEL.r],
    [0, -WHEEL.y1, AXLE_Z + WHEEL.r],
    [0, WHEEL.y1, AXLE_Z - WHEEL.r],
    [MOTOR.x0, PINION.y, AXLE_Z + MOTOR.r],
    [0, 0, AXLE_Z + RING.r + 2],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3) => iso(point, P);
