import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * A rotor-head bench, in millimetres. The main shaft is the z axis; x points at the nose,
 * so angle 0 round the shaft is "over the nose". z is up from the base plate's top.
 */

export const WIDTH = 640;
export const HEIGHT = 460;
export const AZIMUTH = 38;

export const BASE: Plan = { x: -88, y: -72, w: 176, d: 144, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 6;

export const SHAFT = { r: 2.5, top: 108 };
export const BEARING: Plan = { x: -13, y: -13, w: 26, d: 26, r: 3 };
export const BEARING_H = 24;

/* Each servo stands beside the radial line its link rises on; its arm swings in that plane. */
export const SERVO = { pivotR: 35, pivotZ: 30, arm: 10, depth: 12, width: 23, gap: 1.5, top: 36 };

export const LOWER = { z: 62, h: 4, r: 23 }; // the swashplate's fixed bottom ring
export const UPPER = { z: 66, h: 4, r: 20 }; // the top ring, turning with the head
export const LINK = 34; // servo link, ball to ball, at mid stick
export const PITCH_LINK = 28;
export const HUB_Z = 96; // spindle height
export const GRIP = { from: 14, to: 34 };
export const BLADE = { from: 34, to: 100 };

/* The anti-rotation post that stops the bottom ring turning with the head. */
export const POST = { x: 33, r: 2.2, top: 80 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [BLADE.to, 0, HUB_Z + 4],
    [-BLADE.to, 0, HUB_Z + 4],
    [0, BLADE.to, HUB_Z + 4],
    [0, -BLADE.to, HUB_Z + 4],
    [0, 0, SHAFT.top + 6],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
