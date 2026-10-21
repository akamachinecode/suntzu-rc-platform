import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/** A beam balance on a bench, in units of 2 mm. The beam runs along x, nose end at +x. */

export const WIDTH = 640;
export const HEIGHT = 330;
export const AZIMUTH = 86;
export const MM = 0.5; // world units per millimetre

export const BASE: Plan = { x: -156, y: -34, w: 312, d: 68, r: 8 };
export const BASE_H = 8;
export const FOOT_H = 5;

export const PIVOT_Z = 86; // knife-edge apex, where the beam's underside rests
export const BEAM_HALF = 150;
export const BEAM_T = 6;
export const BEAM_W = 6; // half width in y
export const STOP_X = 125;
/** A short pointer off the back of the beam's tail end, reading a vertical scale beside it. */
export const POINTER = { u: -145, up: 3, from: -BEAM_W, to: -10.6 };
export const SCALE_POST = { x: -148, y: -14.5, w: 8, d: 4, r: 0.6 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-BEAM_HALF, 0, PIVOT_Z + 30],
    [BEAM_HALF, 0, PIVOT_Z + 30],
    [0, 0, PIVOT_Z + 34],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
