import { depthOf, translateAlong, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { rod } from "./geometry";
import { STRAP, liftOf, riseOf, scaleOf } from "./model";
import { BLADE_R, DECK, HEAD_Z, P, SKID_Y } from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;

const AIRFOIL: Array<[number, number]> = [
  [-3.4, 0],
  [-2, -0.45],
  [1.6, -0.6],
  [4.2, -0.4],
  [5, 0],
  [4.2, 0.5],
  [1.6, 0.7],
  [-2, 0.55],
];

export interface RotorFrame {
  rise: number;
  /** Screen offset for everything that lifts with the helicopter. */
  lifted: string;
  /** Far blade first. */
  blades: [SolidPaths, SolidPaths];
  straps: [SolidPaths, SolidPaths];
  grams: string;
  lift: number;
}

export function rotorOf(turn: number, pitch: number): RotorFrame {
  const rise = riseOf(pitch) * STRAP;
  const th = pitch * RAD;
  const blades = [0, 180].map((offset) => {
    const a = (turn + offset) * RAD;
    const out: Vec = [Math.cos(a), Math.sin(a), 0];
    const ahead: Vec = [-Math.sin(a), Math.cos(a), 0];
    const chord: Vec = [ahead[0] * Math.cos(th), ahead[1] * Math.cos(th), Math.sin(th)];
    const up: Vec = [-ahead[0] * Math.sin(th), -ahead[1] * Math.sin(th), Math.cos(th)];
    // Built at rest height; the lifted group carries it up with the body.
    const F = G.frameOf([0, 0, DECK + HEAD_Z], out, chord, up);
    return {
      depth: depthOf([out[0] * 50, out[1] * 50, DECK + HEAD_Z], P),
      paths: G.prismOf(F, AIRFOIL, 5, BLADE_R, P),
    };
  });
  blades.sort((x, y) => x.depth - y.depth);
  const straps = [-1, 1].map((side) =>
    rod([0, side * SKID_Y, DECK + 1], [0, side * SKID_Y, DECK + 2.6 + rise], 0.9),
  ) as [SolidPaths, SolidPaths];
  return {
    rise,
    lifted: rise > 0.01 ? translateAlong(P, [0, 0, rise]) : "",
    blades: [blades[0]!.paths, blades[1]!.paths],
    straps,
    grams: `${Math.round(scaleOf(pitch))}`.padStart(4, " "),
    lift: liftOf(pitch),
  };
}
