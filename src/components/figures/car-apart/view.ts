import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";
import { MOVES } from "./model";

/**
 * World layout, in units of 4 mm. x runs from the rear bumper to the nose, y across (+y is the
 * truck's left, the near side), z is up from the bottom of the tyres.
 */

export const WIDTH = 640;
export const HEIGHT = 440;
export const AZIMUTH = 56;

export const AXLE_X = 40.25; // half the 322 mm wheelbase
export const TRACK_Y = 29.4; // tyre centre, half of 282 mm less half a tyre
export const TYRE = { r: 13.75, w: 11.75 };
export const AXLE_Z = TYRE.r;

/* Chassis. */
export const FLOOR = { z0: 6, z1: 7.6 };
export const CHASSIS: Plan = { x: -47, y: -12, w: 94, d: 24, r: 5 };
export const TOWER = { front: 34, rear: -46, z0: 15, z1: 30 };

/* Display stand. */
export const STAND: Plan = { x: -40, y: -30, w: 80, d: 60, r: 6 };
export const STAND_TOP = -26;

const moved = (points: Point3[], move: [number, number, number]) =>
  points.map(([x, y, z]) => [x + move[0], y + move[1], z + move[2]] as Point3);

export const P = fitProjection(
  [
    ...boxCorners(STAND, STAND_TOP - 10, STAND_TOP),
    ...moved(
      [
        [62, 27, 42],
        [-62, -27, 42],
      ],
      MOVES.body,
    ),
    ...moved([[AXLE_X, TRACK_Y + TYRE.w, AXLE_Z + TYRE.r]], MOVES["left-wheels"]),
    ...moved([[-AXLE_X, -TRACK_Y - TYRE.w, AXLE_Z + TYRE.r]], MOVES["right-wheels"]),
    ...moved([[-52, 0, 22]], MOVES.drivetrain),
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
