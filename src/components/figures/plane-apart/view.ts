import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";
import { MOVES } from "./model";

/**
 * World layout, in units of 4 mm. x runs from tail to nose, y across the span
 * (+y is the near wing), z is up. The fuselage bottom is z = 0.
 */

export const WIDTH = 640;
export const HEIGHT = 440;
export const AZIMUTH = 58;

/* Fuselage: a balsa box with a flat top, an open cabin under the wing and a hatch in front. */
export const NOSE_X = 118;
export const TAIL_X = -150;
export const HALF_FRONT = 14;
export const HALF_TAIL = 4;
export const TOP_Z = 36;
export const BELLY_END = 10; // the bottom is flat back to here, then rises
export const TAIL_BOTTOM = 24;
export const WALL = 2;
export const CABIN = { from: 10, to: 80 };
export const HATCH = { from: 82, to: 116 };

/* Wing: flat-bottom section, 60 units of chord, 175 per half, 3° dihedral. */
export const WING_LE = 80;
export const CHORD = 60;
export const HALF_SPAN = 175;
export const AILERON = { from: 95, chord: 12 };

/* Tail. */
export const STAB_LE = -115;
export const STAB_CHORD = 35;
export const STAB_HALF = 65;
export const ELEVATOR_CHORD = 15;
export const FIN_LE = -118;

/* Nose. */
export const SPINNER_R = 8.5;
export const PROP_R = 31.75; // 254 mm / 2 / 4

/* Display stand under the balance point. */
export const STAND: Plan = { x: 4, y: -52, w: 116, d: 104, r: 8 };
export const STAND_TOP = -78;
export const POST_X = 62;

export const halfWidthAt = (x: number) =>
  HALF_TAIL + ((HALF_FRONT - HALF_TAIL) * (x - TAIL_X)) / (NOSE_X - TAIL_X);

const lifted = (points: Point3[], move: [number, number, number]) =>
  points.map(([x, y, z]) => [x + move[0], y + move[1], z + move[2]] as Point3);

const EXTREMES: Point3[] = [
  ...boxCorners(STAND, STAND_TOP - 12, STAND_TOP),
  [TAIL_X - 20, 0, TOP_Z + 58],
  [NOSE_X + 36, 0, 18],
  [WING_LE, HALF_SPAN, TOP_Z + 16],
  [WING_LE - CHORD, -HALF_SPAN, TOP_Z + 16],
];

export const P = fitProjection(
  [
    ...EXTREMES,
    ...lifted(
      [
        [WING_LE, HALF_SPAN, TOP_Z + 16],
        [WING_LE - CHORD, -HALF_SPAN, TOP_Z + 16],
      ],
      MOVES.wing,
    ),
    ...lifted(
      [
        [NOSE_X + 36, 0, 18 + PROP_R],
        [NOSE_X + 36, 0, 18 - PROP_R],
      ],
      MOVES.prop,
    ),
    ...lifted([[TAIL_X - 20, 0, TOP_Z + 58]], MOVES.fin),
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
