import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";
import { DROP_MM } from "./model";

/**
 * A shock dyno for one corner, in millimetres. The coil-over stands on the base at the
 * origin; a carriage loaded with a quarter of the truck rides two guide rods above it.
 * z is up from the base top. The chart lies on the base in front (+x).
 */

export const WIDTH = 640;
export const HEIGHT = 470;
export const AZIMUTH = 32;

export const BASE: Plan = { x: -34, y: -52, w: 98, d: 104, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

export const ROD_Y = 22;
export const ROD_TOP = 168;
export const RIDE_Z = 104; // carriage underside, settled
export const CARRIAGE_H = 8;

/* The shock: body, shaft, spring. */
export const EYE_Z = 10;
export const BODY = { z0: 16, z1: 66, r: 7.5 };
export const SHAFT_R = 1.75;
export const PERCH_Z = 32;
export const SPRING = { r: 10, turns: 7 };

/* The scale the carriage's pointer reads, and the chart on the base. */
export const SCALE = { x: -2, y: 31, w: 4, d: 3 };
export const CHART: Plan = { x: 20, y: -44, w: 38, d: 88, r: 2 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [0, -ROD_Y - 6, ROD_TOP + 8],
    [0, ROD_Y + 6, ROD_TOP + 8],
    [0, 0, RIDE_Z + DROP_MM + CARRIAGE_H + 24],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
