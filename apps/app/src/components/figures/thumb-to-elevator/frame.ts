import { iso, type Flat, type Plane, type Point3, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import {
  ARM_HOLE,
  ELEVATOR_CHORD,
  HINGE,
  HORN_HOLE,
  SPLINE,
  STICK_TILT,
  armHoleOf,
  elevatorOf,
  hornHoleOf,
  type State,
} from "./model";
import {
  ARM_T,
  ARM_Y,
  LINK_Y,
  P,
  PANEL_TOP,
  PIVOT,
  STAB_Y0,
  STAB_Y1,
  STICK_LEN,
  STICK_R,
} from "./view";

const RAD = Math.PI / 180;
const Y: Point3 = [0, 1, 0];
const at = (point: Point3): Flat => iso(point, P);

/** A frame turning in the x–z plane about an axis along y. Angle 0 points u along +x. */
function swing(origin: Point3, angle: number) {
  const c = Math.cos(angle * RAD);
  const s = Math.sin(angle * RAD);
  return G.frameOf(origin, Y, [c, 0, s], [-s, 0, c]);
}

/** Knurl lines that fade toward the limb, bucketed so each opacity is one path. */
export const KNURL_LEVELS = [0.25, 0.5, 0.75, 1] as const;
function bucketed(lines: Array<{ d: string; alpha: number }>) {
  const out = KNURL_LEVELS.map(() => [] as string[]);
  for (const { d, alpha } of lines) {
    const level = Math.min(KNURL_LEVELS.length - 1, Math.max(0, Math.round(alpha * 4) - 1));
    if (alpha > 0.1) out[level]!.push(d);
  }
  return out.map((list) => list.join(""));
}

/* Stick: a shaft rising out of the panel slot, a collar, and a knurled grip. */

const GRIP_FROM = 37.5;
const GRIP: Array<[number, number] | [number, number, number]> = [
  [GRIP_FROM, 2.4],
  [GRIP_FROM + 1.6, 4.4],
  [STICK_LEN - 1.6, 4.4],
  [STICK_LEN - 0.6, 3.6, 1],
  [STICK_LEN, 2, 1],
];

export interface StickFrame {
  collar: SolidPaths;
  shaft: SolidPaths;
  grip: SolidPaths;
  knurl: string[];
}

export function stickOf(stick: number): StickFrame {
  const tilt = stick * STICK_TILT * RAD;
  const axis: Point3 = [Math.sin(tilt), 0, Math.cos(tilt)];
  const F = G.frameAlong(PIVOT, axis);
  const out = (PANEL_TOP - PIVOT[2]) / Math.cos(tilt);
  return {
    collar: G.disc(out, out + 2.2, 3.6, F, P),
    shaft: G.solidOf(
      [
        [out + 2.2, STICK_R],
        [GRIP_FROM + 0.2, STICK_R],
      ],
      F,
      P,
    ),
    grip: G.solidOf(GRIP, F, P),
    knurl: bucketed(
      G.ribsOf(F, GRIP_FROM + 2, STICK_LEN - 2, 4.4, 30, P, {
        fade: [0.04, 0.42],
        seams: true,
      }),
    ),
  };
}

/* Servo arm: a tapered single arm on the spline, with three holes and a hub screw. */

const ARM_SHAPE = G.stadium(4.8, 2.6, ARM_HOLE + 2);
const ARM_HOLES = [ARM_HOLE - 6, ARM_HOLE - 3, ARM_HOLE];

export interface ArmFrame {
  arm: SolidPaths;
  holes: Flat[];
  hub: string;
  hubDot: Flat;
}

export function armOf(servo: number): ArmFrame {
  // Angle 0 points the arm straight up, so the frame's u starts along +z.
  const F = swing([SPLINE.x, ARM_Y, SPLINE.z], 90 - servo);
  const face = ARM_Y + ARM_T;
  const along = (d: number): Point3 => [SPLINE.x + F.u[0] * d, face, SPLINE.z + F.u[2] * d];
  return {
    arm: G.prismOf(F, ARM_SHAPE, 0, ARM_T, P),
    holes: ARM_HOLES.map((d) => at(along(d))),
    hub: G.circleOf(F, ARM_T, 2, P, 20),
    hubDot: at(along(0)),
  };
}

/* Horn and elevator turn together about the hinge line. */

const HORN_T = 1.6;
const HORN_SHAPE: Plane[] = [
  [1, -3.2],
  [14, -3.2],
  [3, -HORN_HOLE - 0.5],
  [0, -HORN_HOLE - 3],
  [-2.6, -HORN_HOLE - 0.5],
];
const ELEVATOR_SHAPE: Plane[] = [
  [0.4, 2.2],
  [0.8, 2.8],
  [ELEVATOR_CHORD, 0.6],
  [ELEVATOR_CHORD, -0.6],
  [0.8, -2.8],
  [0.4, -2.2],
];

export interface SurfaceFrame {
  horn: SolidPaths;
  hornHoles: Flat[];
  elevator: SolidPaths;
}

export function surfaceOf(elevator: number): SurfaceFrame {
  const F = swing([HINGE.x, 0, HINGE.z], elevator);
  const front = LINK_Y + HORN_T / 2;
  const hole = (d: number) => at([HINGE.x - F.v[0] * d, front, HINGE.z - F.v[2] * d]);
  return {
    horn: G.prismOf(F, HORN_SHAPE, LINK_Y - HORN_T / 2, front, P),
    hornHoles: [HORN_HOLE - 7, HORN_HOLE - 3.5].map(hole),
    elevator: G.prismOf(F, ELEVATOR_SHAPE, STAB_Y0, STAB_Y1, P),
  };
}

/* Pushrod: a Z-bend through the arm, the wire, and a clevis on the horn with its pin. */

const ROD_R = 0.8;
const CLEVIS_BACK = 11;
const CLEVIS_FRONT = 2.6;
const CLEVIS: Plane[] = [
  [-2.3, -1.7],
  [2.3, -1.7],
  [2.3, 1.7],
  [-2.3, 1.7],
];

export interface RodFrame {
  bend: SolidPaths;
  rod: SolidPaths;
  clevis: SolidPaths;
  pin: SolidPaths;
}

export function rodOf(servo: number, elevator: number): RodFrame {
  const [tx, tz] = armHoleOf(servo);
  const [hx, hz] = hornHoleOf(elevator);
  const length = Math.hypot(hx - tx, hz - tz);
  const dir: Point3 = [(hx - tx) / length, 0, (hz - tz) / length];
  const tail: Point3 = [tx, LINK_Y, tz];
  const head: Point3 = [hx, LINK_Y, hz];
  const side: Point3 = [-dir[2], 0, dir[0]];
  const along = G.frameAlong(tail, dir);
  return {
    bend: G.disc(
      0,
      LINK_Y - ARM_Y - ARM_T + 0.4,
      ROD_R,
      G.frameAlong([tx, ARM_Y + ARM_T - 0.4, tz], Y),
      P,
    ),
    rod: G.solidOf(
      [
        [0, ROD_R],
        [length - CLEVIS_BACK + 1, ROD_R],
      ],
      along,
      P,
    ),
    clevis: G.prismOf(G.frameOf(head, dir, Y, side), CLEVIS, -CLEVIS_BACK, CLEVIS_FRONT, P),
    pin: G.disc(2.3, 3, 1.1, G.frameAlong(head, Y), P),
  };
}

export interface Frame {
  stick: StickFrame;
  arm: ArmFrame;
  surface: SurfaceFrame;
  rod: RodFrame;
}

export function frameOf(state: State): Frame {
  const elevator = elevatorOf(state.servo);
  return {
    stick: stickOf(state.stick),
    arm: armOf(state.servo),
    surface: surfaceOf(elevator),
    rod: rodOf(state.servo, elevator),
  };
}
