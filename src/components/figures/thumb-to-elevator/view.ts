import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "@/components/iso/iso-kit";
import { ELEVATOR_CHORD, HINGE, SPLINE } from "./model";

/**
 * World layout of the test bench, in millimetres. x runs from the transmitter
 * towards the tail, y from the back of the bench to the front, z is up.
 * The linkage (arm, pushrod, horn) lies in the plane y = LINK_Y.
 */

export const WIDTH = 640;
export const HEIGHT = 330;
const PAD = 16;
export const AZIMUTH = 62;

/** The bench board. */
export const BASE: Plan = { x: -146, y: -94, w: 350, d: 128, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 6;

/** Ruler strip along the front edge and the label plate. */
export const STRIP: Plan = { x: -124, y: 22, w: 300, d: 6, r: 1 };
export const LABEL: Plan = { x: -134, y: 6, w: 44, d: 11, r: 2 };

/** Transmitter gimbal module. */
export const GIMBAL: Plan = { x: -136, y: -40, w: 56, d: 36, r: 4 };
export const GIMBAL_H = 24;
export const PANEL_TOP = GIMBAL_H + 1.2;
export const PIVOT: Point3 = [-110, -22, 13];
export const SLOT: Plan = { x: -127, y: -25, w: 34, d: 6, r: 3 };
export const STICK_R = 2.1;
export const STICK_LEN = 46;
export const ANTENNA: [number, number] = [-87, -33];

/** Receiver on a foam pad. */
export const PAD_PLAN: Plan = { x: -70, y: -32, w: 44, d: 28, r: 3 };
export const PAD_H = 3;
export const RX: Plan = { x: -66, y: -28, w: 34, d: 20, r: 2.5 };
export const RX_H = 12;
export const RX_TOP = PAD_H + RX_H;
export const PLUG: Plan = { x: -32, y: -21, w: 7, d: 9, r: 1 };

/** Servo lying on its side, output face towards the viewer (+y). */
export const LINK_Y = 6;
export const SERVO: Plan = { x: 0, y: -38, w: 40, d: 38, r: 1.5 };
export const SERVO_Z = SPLINE.z - 10;
export const SERVO_H = 20;
export const SERVO_TOP = SERVO_Z + SERVO_H;
export const TAB_Y = -15;
export const BLOCKS: Plan[] = [
  { x: -12, y: -30, w: 10, d: 15, r: 1 },
  { x: 42, y: -30, w: 10, d: 15, r: 1 },
];
export const BLOCK_H = SERVO_TOP - 2;
export const ARM_Y = 2.6;
export const ARM_T = 2.2;

/** Tail section: stabiliser clamped at its far end, elevator on the hinge. */
export const STAB_LE = 75;
export const STAB_Y0 = -62;
export const STAB_Y1 = 10;
export const STAB_HALF = 3;
export const CLAMP: Plan = { x: 82, y: -80, w: 24, d: 24, r: 2 };
export const KNOB: [number, number] = [94, -68];

/** Ruler post beside the trailing edge, its front face flush with the elevator's end. */
export const POST: Plan = { x: HINGE.x + ELEVATOR_CHORD + 1.5, y: STAB_Y1 - 8, w: 8, d: 8, r: 0.8 };
export const POST_H = 94;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners(POST, 0, POST_H),
    [PIVOT[0], PIVOT[1], PIVOT[2] + STICK_LEN + 4],
    [ANTENNA[0], ANTENNA[1], 64],
    [KNOB[0], KNOB[1], HINGE.z + 22],
  ],
  WIDTH,
  HEIGHT,
  { pad: PAD, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
