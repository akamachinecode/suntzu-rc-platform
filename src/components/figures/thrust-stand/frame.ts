import { iso, onTop, type Flat, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { KNOB } from "./geometry";
import { AXIS_Z, P, PROP_R, PROP_X } from "./view";

const RAD = Math.PI / 180;

/** One prop blade turned to `angle` (degrees) about the motor axis. */
function blade(angle: number): SolidPaths {
  const c = Math.cos(angle * RAD);
  const s = Math.sin(angle * RAD);
  const F = G.frameOf([PROP_X, 0, AXIS_Z], [1, 0, 0], [0, c, s], [0, -s, c]);
  return G.prismOf(
    F,
    [
      [3.4, -3.4],
      [16, -6.4],
      [40, -5.8],
      [PROP_R - 3, -3.4],
      [PROP_R, -0.6],
      [PROP_R - 2, 2.2],
      [40, 4.2],
      [16, 4.8],
      [3.4, 3],
    ],
    -0.9,
    0.9,
    P,
  );
}

export interface Frame {
  blades: [SolidPaths, SolidPaths];
  pointer: string;
  pointerTip: Flat;
}

export function frameOf(phase: number, throttle: number): Frame {
  const knob = (-135 + 270 * throttle) * RAD;
  const tip: [number, number] = [
    KNOB.x + Math.sin(knob) * KNOB.r * 0.78,
    KNOB.y - Math.cos(knob) * KNOB.r * 0.78,
  ];
  return {
    blades: [blade(phase), blade(phase + 180)],
    pointer: onTop([[KNOB.x, KNOB.y], tip], KNOB.z, P),
    pointerTip: iso([tip[0], tip[1], KNOB.z], P),
  };
}
