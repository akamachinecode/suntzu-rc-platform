import { iso, type Flat, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import {
  BLADE_ANGLES,
  BLADE_R,
  BODY_Z,
  BOOM,
  FRAME,
  HEAD_Z,
  P,
  POINTER_Z,
  SHAFT_TOP,
  TABLE,
  TAIL_ROTOR,
  TAIL_X,
} from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const Z: Vec = [0, 0, 1];
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
function rod(a: Vec, b: Vec, r: number) {
  const d: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return G.disc(0, Math.hypot(d[0], d[1], d[2]), r, G.frameAlong(a, unit(d)), P, { steps: 14 });
}

const CANOPY: Array<[number, number] | [number, number, number]> = [
  [0, 0],
  [1, 3, 1],
  [3, 5.4, 1],
  [7, 7.8, 1],
  [12, 9.6, 1],
  [20, 10.6, 1],
  [30, 10.4, 1],
  [38, 9.4],
];

const BLADE: Array<[number, number]> = [
  [-4.5, -0.6],
  [4.5, -0.6],
  [4.5, 0.6],
  [-4.5, 0.6],
];

export interface BodyFrame {
  index: string;
  pointer: SolidPaths;
  tip: Flat;
  boom: SolidPaths;
  fin: SolidPaths;
  gearbox: SolidPaths;
  tailHub: SolidPaths;
  tailBlades: [SolidPaths, SolidPaths];
  frame: SolidPaths;
  canopy: SolidPaths;
  /** Far blade first. */
  blades: [SolidPaths, SolidPaths];
  hub: SolidPaths;
}

/** The body turned `twist` degrees on the turntable, its tail blades at `pitch` degrees. */
export function bodyOf(twist: number, pitch: number): BodyFrame {
  const c = Math.cos(twist * RAD);
  const s = Math.sin(twist * RAD);
  const turn = ([x, y, z]: Vec): Vec => [x * c - y * s, x * s + y * c, z];
  const nose = turn([1, 0, 0]);
  const side = turn([0, 1, 0]);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    G.prismOf(
      G.frameOf([0, 0, z0], Z, nose, side),
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      0,
      z1 - z0,
      P,
    );

  const tailCentre = turn([TAIL_X, TAIL_ROTOR.y, BOOM.z]);
  const th = pitch * RAD;
  // The tail blades turn about their own span (up and down) as their pitch changes.
  const chord = unit(add(add([0, 0, 0], nose, Math.cos(th)), side, Math.sin(th)));
  const normal = unit(add(add([0, 0, 0], nose, -Math.sin(th)), side, Math.cos(th)));
  const tailBlade = (dir: 1 | -1) =>
    G.prismOf(
      G.frameOf(tailCentre, normal, chord, Z),
      dir > 0
        ? [
            [-1.4, 1.6],
            [1.4, 1.6],
            [1, TAIL_ROTOR.r],
            [-1.3, TAIL_ROTOR.r],
          ]
        : [
            [-1.4, -1.6],
            [-1.3, -TAIL_ROTOR.r],
            [1, -TAIL_ROTOR.r],
            [1.4, -1.6],
          ],
      -0.2,
      0.2,
      P,
    );

  const blades = BLADE_ANGLES.map((deg) => {
    const a = (deg + twist) * RAD;
    const out: Vec = [Math.cos(a), Math.sin(a), 0];
    const ahead: Vec = [-Math.sin(a), Math.cos(a), 0];
    return {
      deg,
      paths: G.prismOf(G.frameOf([0, 0, HEAD_Z], out, ahead, Z), BLADE, 5, BLADE_R, P),
    };
  });
  // The blade pointing back over the boom is the far one at this camera.
  blades.sort((x, y) => Math.cos((y.deg + 140) * RAD) - Math.cos((x.deg + 140) * RAD));

  const tipAt = turn([TAIL_X - 3, 0, POINTER_Z]);
  return {
    // The index mark runs from the frame's side out to the turning plate's rim.
    index: `M${iso(turn([0, FRAME.y, BODY_Z]), P).join(" ")}L${iso(turn([0, TABLE.r - 2, BODY_Z]), P).join(" ")}`,
    pointer: rod(turn([TAIL_X - 3, 0, BOOM.z - 2]), add(tipAt, [0, 0, 0.6]), 0.5),
    tip: iso(tipAt, P),
    boom: rod(turn([BOOM.from, 0, BOOM.z]), turn([BOOM.to, 0, BOOM.z]), BOOM.r),
    fin: G.prismOf(
      G.frameOf([0, 0, 0], side, nose, Z),
      [
        [-124, BOOM.z - 1],
        [-131, BOOM.z - 1],
        [-137, BOOM.z - 15],
        [-130.5, BOOM.z - 15],
      ],
      -0.3,
      0.3,
      P,
    ),
    gearbox: box(-133, -124, -2.2, 2.2, BOOM.z - 2.2, BOOM.z + 2.2),
    tailHub: G.disc(-1.2, 0.4, 1.5, G.frameAlong(tailCentre, side), P),
    tailBlades: [tailBlade(1), tailBlade(-1)],
    frame: box(FRAME.x0, FRAME.x1, -FRAME.y, FRAME.y, BODY_Z, FRAME.z1),
    canopy: G.solidOf(
      CANOPY.map((k) => [...k] as [number, number]),
      G.frameOf(turn([FRAME.x1 + 30, 0, 26]), [-nose[0], -nose[1], 0], Z, side),
      P,
    ),
    blades: [blades[0]!.paths, blades[1]!.paths],
    hub: box(-2.6, 2.6, -3.4, 3.4, HEAD_Z - 2.4, HEAD_Z + 2.4),
  };
}

export const SHAFT = G.disc(FRAME.z1, SHAFT_TOP, 1.25, G.frameAlong([0, 0, 0], Z), P);
export const PLATE = G.disc(
  TABLE.ring,
  TABLE.ring + TABLE.plate,
  TABLE.r - 2,
  G.frameAlong([0, 0, 0], Z),
  P,
);
