import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A torque bench, in units of 4 mm. The main shaft is the z axis and the turntable's
 * pivot; x points at the nose, the boom runs out along −x. z is up from the base's top.
 */

export const WIDTH = 640;
export const HEIGHT = 420;
export const AZIMUTH = 52;

export const BASE: Plan = { x: -150, y: -56, w: 210, d: 112, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

export const TABLE = { r: 22, ring: 4, plate: 2 }; // turntable: fixed ring, turning plate on top
export const BODY_Z = TABLE.ring + TABLE.plate; // the frame stands on the turning plate

export const FRAME = { x0: -20, x1: 26, y: 7, z1: 40 };
export const SHAFT_TOP = 66;
export const HEAD_Z = 62;
export const BLADE_R = 88; // 710 mm rotor
export const BLADE_ANGLES = [38, 218]; // where the blades stand, relative to the nose

export const BOOM = { from: -20, to: -130, z: 26, r: 1.5 };
export const TAIL_X = -128;
export const TAIL_ROTOR = { r: 12.5, y: 6 };

/* The scale under the tail: an arc on the base the boom's pointer reads against. */
export const SCALE_R = 131;
export const POINTER_Z = 4;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [BLADE_R * Math.cos(0.66), BLADE_R * Math.sin(0.66), HEAD_Z + 2],
    [-BLADE_R * Math.cos(0.66), -BLADE_R * Math.sin(0.66), HEAD_Z + 2],
    [TAIL_X, 0, BOOM.z + TAIL_ROTOR.r + 2],
    [0, 0, SHAFT_TOP + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
