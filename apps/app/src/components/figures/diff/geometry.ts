import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import type { Vec } from "../bench/shapes";
import {
  AXLE_Z,
  BASE,
  BASE_H,
  FOOT_H,
  MOTOR,
  P,
  PILLOW_Y,
  PINION,
  PLATE,
  RING,
  SHAFT_R,
  SIDE,
  WHEEL,
  at,
} from "./view";

const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");

/** The axle's frame: s runs along y, angle 0 points along +x and a quarter turn points up. */
export const AXLE = G.frameOf([0, 0, AXLE_Z], Y, X, Z);
/** The same axis, pointing the other way, for parts that face the far side. */
export const AXLE_BACK = G.frameOf([0, 0, AXLE_Z], [0, -1, 0], X, Z);
/** The input pinion's shaft, running back along −x. */
export const INPUT = G.frameOf([-14, PINION.y, AXLE_Z], [-1, 0, 0], Y, Z);

const LABEL: Plan = { x: BASE.x + BASE.w - 22, y: BASE.y + 10, w: 14, d: 30, r: 1.5 };

/** A pedestal and bearing housing for the shaft at y. */
function pillow(y: number) {
  const foot: Plan = { x: -10, y: y - 7, w: 20, d: 14, r: 2 };
  return {
    foot: slabOf(foot, 0, 3, P, 4, 0.4),
    footScrews: dots(corners(foot, 3).map(([x, yy]) => [x, yy, 3])),
    post: slabOf({ x: -5, y: y - 4, w: 10, d: 8, r: 1.2 }, 3, AXLE_Z - 6 - 3, P, 3, 0.3),
    housing: G.disc(y - 4, y + 4, 7, AXLE, P),
    seam: G.circleOf(AXLE, y + 4, 4, P, 32),
  };
}

export const STATIC = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 14).map(([x, y]) => cylinder(x, y, 5, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  base: slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4),
  groove: planOutline(insetPlan(BASE, 4.5), 0, P),
  screwRings: join(corners(BASE, 7).map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: dots(corners(BASE, 7).map(([x, y]) => [x, y, 0])),
  label: slabOf(LABEL, 0, 0.8, P, 3),
  labelLine: planOutline(insetPlan(LABEL, 1.4), 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [LABEL.x + 3 + row * 2.6, LABEL.y + 4],
          [LABEL.x + 3 + row * 2.6, LABEL.y + (row === 1 ? 16 : 24)],
        ],
        0.8,
        P,
      ),
    ),
  ),

  // the drive: a motor on a pedestal standing in for the gearbox, its shaft, the pinion
  motorPost: slabOf(
    { x: MOTOR.x0 + 2, y: PINION.y - 6, w: MOTOR.x1 - MOTOR.x0 - 4, d: 12, r: 1.5 },
    0,
    AXLE_Z - MOTOR.r,
    P,
    3,
    0.4,
  ),
  // INPUT's s runs back from x = -14, so the motor sits from s = 34 to 52
  motor: G.disc(-14 - MOTOR.x1, -14 - MOTOR.x0, MOTOR.r, INPUT, P),
  motorVents: G.ribsOf(INPUT, -12 - MOTOR.x1, -16 - MOTOR.x0, MOTOR.r, 20, P, {
    fade: [0.06, 0.45],
    seams: true,
  }),
  inputShaft: G.disc(7, 34, 2, INPUT, P),
  pinion: G.solidOf(
    [
      [0, 4.2],
      [4, PINION.r],
      [7, PINION.r],
    ],
    INPUT,
    P,
  ),

  farPillow: pillow(-PILLOW_Y),
  nearPillow: pillow(PILLOW_Y),
  farShaft: G.disc(-WHEEL.y0 + 1.2, -SIDE.at - 3, SHAFT_R, AXLE, P),
  nearShaft: G.disc(PLATE.y1 + 1, WHEEL.y0 - 1.2, SHAFT_R, AXLE, P),

  ring: G.disc(RING.y0, RING.y1, RING.r, AXLE, P),
  // the boss where the bridge holds the near axle shaft
  plate: G.disc(PLATE.y0, PLATE.y1 + 1, PLATE.r, AXLE, P),
  // side gears: a toothed cone facing the middle, on a short hub
  sideNear: G.solidOf(
    [
      [SIDE.at - 3, SIDE.r - 2.6],
      [SIDE.at + 0.5, SIDE.r],
      [SIDE.at + 3, SIDE.r],
    ],
    AXLE,
    P,
  ),
  sideFar: G.solidOf(
    [
      [SIDE.at - 3, SIDE.r - 2.6],
      [SIDE.at + 0.5, SIDE.r],
      [SIDE.at + 3, SIDE.r],
    ],
    AXLE_BACK,
    P,
  ),

  // wheels: tyre, rim and hub nut. The near wheel shows its outer face, the far its inner.
  tyreNear: G.disc(WHEEL.y0, WHEEL.y1, WHEEL.r, AXLE, P),
  rimNear: G.disc(WHEEL.y1, WHEEL.y1 + 1.2, 15, AXLE, P),
  nutNear: G.disc(WHEEL.y1 + 1.2, WHEEL.y1 + 3.2, 4, AXLE, P),
  tyreFar: G.disc(-WHEEL.y1, -WHEEL.y0, WHEEL.r, AXLE, P),
  rimFar: G.disc(-WHEEL.y0, -WHEEL.y0 + 1.2, 15, AXLE, P),
  // the tyre's sidewall line, and the rim face's hub ring and edge, where the spokes end
  wallNear:
    G.circleOf(AXLE, WHEEL.y1, WHEEL.r - 5, P, 64) +
    G.circleOf(AXLE, WHEEL.y1 + 1.2, 5, P, 32) +
    G.circleOf(AXLE, WHEEL.y1 + 1.2, 15, P, 64),
  wallFar:
    G.circleOf(AXLE, -WHEEL.y0, WHEEL.r - 5, P, 64) +
    G.circleOf(AXLE, -WHEEL.y0 + 1.2, 5, P, 32) +
    G.circleOf(AXLE, -WHEEL.y0 + 1.2, 15, P, 64),
};
