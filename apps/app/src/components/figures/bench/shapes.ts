import {
  depthOf,
  iso,
  pathOf,
  type Flat,
  type Point3,
  type Projection,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";

/**
 * Small geometry helpers the car figures share: rods between two points, upright coils,
 * gear teeth and spokes that turn with a phase. Pure functions, safe on the server.
 */

export type Vec = [number, number, number];

export const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** A round rod, tube or pin from a to b. */
export function rodBetween(a: Vec, b: Vec, r: number, P: Projection) {
  const d: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return G.disc(0, Math.hypot(d[0], d[1], d[2]), r, G.frameAlong(a, unit(d)), P);
}

/**
 * A coil spring standing on z, split into the half behind its axis and the half in front,
 * so the body it wraps can be painted between them.
 */
export function uprightCoil(
  cx: number,
  cy: number,
  r: number,
  z0: number,
  z1: number,
  turns: number,
  P: Projection,
  perTurn = 20,
) {
  const count = Math.max(1, Math.round(turns * perTurn));
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const angle = share * turns * Math.PI * 2;
    const point: Point3 = [
      cx + r * Math.cos(angle),
      cy + r * Math.sin(angle),
      z0 + (z1 - z0) * share,
    ];
    const facing = depthOf([Math.cos(angle), Math.sin(angle), 0], P) > 0;
    const flat = iso(point, P);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}

/** Straight lines from r0 to r1 on a face at s, `count` of them, turned by `phase` radians. */
export function spokes(
  F: G.Frame,
  s: number,
  r0: number,
  r1: number,
  count: number,
  phase: number,
  P: Projection,
) {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    lines.push(pathOf([iso(G.pointOf(F, s, r0, a), P), iso(G.pointOf(F, s, r1, a), P)]));
  }
  return lines.join("");
}

/**
 * A coil spring on any frame's axis, from s0 to s1, split into the half behind the axis and
 * the half in front. The two halves meet where the wire turns away, so no end floats.
 */
export function coilAlong(
  F: G.Frame,
  s0: number,
  s1: number,
  r: number,
  turns: number,
  P: Projection,
  perTurn = 20,
) {
  const count = Math.max(1, Math.round(turns * perTurn));
  const back: string[] = [];
  const front: string[] = [];
  let run: Flat[] = [];
  let near: boolean | null = null;
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const angle = share * turns * Math.PI * 2;
    const s = s0 + (s1 - s0) * share;
    const on = G.pointOf(F, s, r, angle);
    const axis = G.pointOf(F, s, 0, angle);
    const facing = depthOf([on[0] - axis[0], on[1] - axis[1], on[2] - axis[2]], P) > 0;
    const flat = iso(on, P);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
