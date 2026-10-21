import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";
import { MOVES } from "./model";

/**
 * World layout, in units of 4 mm. x runs from tail to nose, y across (+y is the near side),
 * z is up. The skid tubes sit at z = 0; the main shaft is the line x = 0, y = 0.
 */

export const WIDTH = 640;
export const HEIGHT = 470;
export const AZIMUTH = 56;

/* Frame: two carbon side plates, the shaft between them. */
export const PLATE_Y = 6; // inner face of each plate
export const PLATE_T = 0.6;
export const PLATE: Array<[number, number]> = [
  [-22, 14],
  [22, 14],
  [28, 22],
  [28, 34],
  [14, 46],
  [4, 52],
  [-8, 52],
  [-22, 34],
];
export const FRAME_BOTTOM = 14;
export const FRAME_TOP = 52;

/* Main gear, shaft and the head above it. */
export const GEAR = { z: 10, h: 1.5, r: 7.6 }; // 121 teeth at module 0.5
export const SHAFT = { r: 1.25, from: 8, to: 79 };
export const SWASH_Z = 60;
export const HEAD_Z = 74; // spindle height
export const BLADE = { from: 4, to: -77, chord: 9, t: 1.2, y: 8.5 };

/* Motor in front of the shaft, its pinion on the main gear's rim. */
export const PINION_R = 0.9; // 11 teeth: 11:1 to the main gear
export const MOTOR = { x: GEAR.r + PINION_R, r: 3.5, z0: 22, z1: 31 };

/* Battery tray and canopy at the front. */
export const TRAY = { x0: 18, x1: 44, z: 22 };
export const CANOPY = { nose: 58, z: 34, length: 50 };

/* Tail boom out of the frame's rear clamp. */
export const BOOM = { from: -20, to: -130, z: 30, r: 1.5 };
export const TAIL_X = -128;
export const TAIL_ROTOR = { r: 12.5, y: 6 };

/* Skids and the display stand. */
export const SKID_Y = 16;
export const STRUT_X = 11;
export const STAND: Plan = { x: -34, y: -26, w: 66, d: 52, r: 6 };
export const STAND_TOP = -28;
export const POST_X = -14;

const moved = (points: Point3[], move: [number, number, number]) =>
  points.map(([x, y, z]) => [x + move[0], y + move[1], z + move[2]] as Point3);

export const P = fitProjection(
  [
    ...boxCorners(STAND, STAND_TOP - 10, STAND_TOP),
    ...moved(
      [
        [BLADE.from, BLADE.y + 5, HEAD_Z + 1],
        [BLADE.to, -BLADE.y - 5, HEAD_Z + 1],
      ],
      MOVES.blades,
    ),
    ...moved([[0, 0, SHAFT.to + 2]], MOVES.head),
    ...moved(
      [
        [CANOPY.nose, 0, CANOPY.z + 12],
        [CANOPY.nose - CANOPY.length, 12, CANOPY.z + 12],
      ],
      MOVES.canopy,
    ),
    ...moved([[BOOM.to - 8, 0, BOOM.z - 14]], MOVES.tail),
    ...moved([[22, SKID_Y + 1, -1]], MOVES.skids),
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
