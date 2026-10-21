import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideSeam,
  slabOf,
  type Flat,
  type Plan,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import type { Vec } from "../bench/shapes";
import { SPUR, STOCK_PINION, radiusOf } from "./model";
import {
  BASE,
  BASE_H,
  CASE,
  CASE_Z,
  FOOT_H,
  INPUT,
  MOTOR,
  OUTPUT,
  P,
  PLATE_Y,
  SPUR_Y,
  WHEEL,
  at,
} from "./view";

const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const RAD = Math.PI / 180;
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");

/** Shafts along +y through a point; the wheel's frame looks out to the far side (−y). */
export const alongY = (x: number, z: number) => G.frameOf([x, 0, z], Y, X, Z);
export const SPUR_AXIS = alongY(INPUT.x, INPUT.z);
export const WHEEL_AXIS = G.frameOf([OUTPUT.x, 0, OUTPUT.z], [0, -1, 0], X, Z);

/** The motor slides along its slot so the pinion stays in mesh: its centre for a pinion. */
export function motorAt(teeth: number): [number, number] {
  const d = radiusOf(SPUR) + radiusOf(teeth);
  const a = MOTOR.angle * RAD;
  return [INPUT.x - d * Math.cos(a), INPUT.z + d * Math.sin(a)];
}
export const STOCK_MOTOR = motorAt(STOCK_PINION);

const LABEL: Plan = { x: BASE.x + BASE.w - 40, y: BASE.y + 10, w: 32, d: 9, r: 1.5 };
const PLATE: Array<[number, number]> = [
  [-2, 70],
  [-2, 90],
  [-12, 124],
  [-46, 124],
  [-52, 98],
  [-30, 70],
];

/** The two slots the motor's screws ride in, on the plate's face, along the motor's line. */
function slots() {
  const a = MOTOR.angle * RAD;
  const dir: [number, number] = [-Math.cos(a), Math.sin(a)];
  const normal: [number, number] = [Math.sin(a), Math.cos(a)];
  const from = motorAt(11);
  const to = motorAt(25);
  const r = 2.2;
  const point = (c: [number, number], t: number): Flat =>
    at([
      c[0] + r * (dir[0] * Math.cos(t) + normal[0] * Math.sin(t)),
      PLATE_Y + 3,
      c[1] + r * (dir[1] * Math.cos(t) + normal[1] * Math.sin(t)),
    ]);
  return join(
    [-1, 1].map((side) => {
      const shift = (c: [number, number]): [number, number] => [
        c[0] + normal[0] * 11 * side,
        c[1] + normal[1] * 11 * side,
      ];
      const run: Flat[] = [];
      for (let i = 0; i <= 12; i++) run.push(point(shift(from), Math.PI / 2 + (i / 12) * Math.PI));
      for (let i = 0; i <= 12; i++) run.push(point(shift(to), -Math.PI / 2 + (i / 12) * Math.PI));
      return pathOf(run, true);
    }),
  );
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
          [LABEL.x + 4, LABEL.y + 2.6 + row * 2],
          [LABEL.x + (row === 1 ? 16 : 24), LABEL.y + 2.6 + row * 2],
        ],
        0.8,
        P,
      ),
    ),
  ),

  // the wheel on the far side: tyre, rim, hub, and the shaft back to the transmission
  tyre: G.solidOf(
    [
      [-WHEEL.y0, WHEEL.r - 6],
      [-WHEEL.y0 + 2, WHEEL.r - 1, 1],
      [-WHEEL.y0 + 6, WHEEL.r, 1],
      [-WHEEL.y1 - 6, WHEEL.r, 1],
      [-WHEEL.y1 - 2, WHEEL.r - 1, 1],
      [-WHEEL.y1, WHEEL.r - 6],
    ],
    WHEEL_AXIS,
    P,
  ),
  rim: G.disc(-WHEEL.y0 - 1.5, -WHEEL.y0 + 0.5, 34, WHEEL_AXIS, P),
  rimLip:
    G.circleOf(WHEEL_AXIS, -WHEEL.y0 - 1.5, 30, P, 64) +
    G.circleOf(WHEEL_AXIS, -WHEEL.y0 - 1.5, 8, P, 32),
  hub: G.disc(-WHEEL.y0 - 5, -WHEEL.y0 - 1.5, 7, WHEEL_AXIS, P),
  shaft: G.disc(-CASE.y, -WHEEL.y0 - 5, 3, WHEEL_AXIS, P),
  cup: G.disc(-CASE.y, -CASE.y + 5, 6.5, WHEEL_AXIS, P),

  // the transmission on two legs
  legs: [CASE.x + 6, CASE.x + CASE.w - 12].map((x) =>
    slabOf({ x, y: CASE.y + 4, w: 6, d: CASE.d - 8, r: 1 }, 0, CASE_Z.z0, P, 3, 0.3),
  ),
  case: slabOf(CASE, CASE_Z.z0, CASE_Z.z1 - CASE_Z.z0, P, 8, 1.2),
  caseSeam: sideSeam(CASE, (CASE_Z.z0 + CASE_Z.z1) / 2, P),
  caseScrews: dots(corners(CASE, 5).map(([x, y]) => [x, y, CASE_Z.z1])),
  outputCap: G.disc(PLATE_Y, PLATE_Y + 2.5, 6.5, alongY(OUTPUT.x, OUTPUT.z), P),

  // the motor plate, its slot, and the spur with its slipper clutch
  plate: G.prismOf(G.frameOf([0, 0, 0], Y, X, Z), PLATE, PLATE_Y, PLATE_Y + 3, P),
  slot: slots(),
  spur: G.disc(SPUR_Y.y0, SPUR_Y.y1, radiusOf(SPUR), SPUR_AXIS, P),
  slipper: G.disc(SPUR_Y.y1, SPUR_Y.y1 + 1.6, 12, SPUR_AXIS, P),
  nut: G.disc(SPUR_Y.y1 + 1.6, SPUR_Y.y1 + 4.2, 3.4, SPUR_AXIS, P),
};

/** The motor, built at the stock pinion's position; other pinions slide it along the slot. */
export const MOTOR_ART = (() => {
  const [x, z] = STOCK_MOTOR;
  const F = alongY(x, z);
  return {
    can: G.disc(PLATE_Y - MOTOR.length, PLATE_Y, MOTOR.r, F, P),
    vents: G.ribsOf(F, PLATE_Y - MOTOR.length + 6, PLATE_Y - 8, MOTOR.r, 24, P, {
      fade: [0.06, 0.45],
      seams: true,
    }),
    endCap: G.disc(PLATE_Y - MOTOR.length - 3, PLATE_Y - MOTOR.length, MOTOR.r - 4, F, P),
    shaft: G.disc(PLATE_Y + 3, SPUR_Y.y0 - 0.5, 1.6, F, P),
    screws: [-1, 1].map((side) => {
      const a = MOTOR.angle * RAD;
      return at([x + Math.sin(a) * 11 * side, PLATE_Y + 3, z + Math.cos(a) * 11 * side]);
    }),
  };
})();

/** The pinion for a tooth count, where the motor puts it. */
export function pinionOf(teeth: number) {
  const [x, z] = motorAt(teeth);
  const F = alongY(x, z);
  return { F, paths: G.disc(SPUR_Y.y0 - 0.5, SPUR_Y.y1 + 0.5, radiusOf(teeth), F, P) };
}
