import { depthOf, type Flat, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { spokes, type Vec } from "../bench/shapes";
import { AXLE, AXLE_BACK, INPUT } from "./geometry";
import { AXLE_Z, P, PINION, PLATE, POST_R, RING, SIDE, SPIDER, WHEEL, at } from "./view";

type Lines = Array<{ d: string; alpha: number }>;
const FADE: [number, number] = [0.05, 0.42];
const CENTRE: Vec = [0, 0, AXLE_Z];

/** One item inside the cage, with the depth it is sorted by. */
export interface CageItem {
  key: string;
  depth: number;
  paths: SolidPaths;
  teeth?: Lines;
  /** The ring on a spider's flat back, where its pin comes through. */
  face?: string;
}

export interface Angles {
  carrier: number;
  left: number;
  right: number;
  spiders: number;
  pinion: number;
}

export interface Frame {
  ringTeeth: Lines;
  ringBolts: Flat[];
  bridge: SolidPaths;
  bridgeBolts: Flat[];
  cage: CageItem[];
  pinionTeeth: Lines;
  treadNear: Lines;
  treadFar: Lines;
  spokesNear: string;
  spokesFar: string;
}

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The bar across the near side that holds the posts' ends, turning with the case. */
function bridgeOf(carrier: number) {
  const phi = carrier + Math.PI / 2;
  const u: Vec = [Math.cos(phi), 0, Math.sin(phi)];
  const v: Vec = [-Math.sin(phi), 0, Math.cos(phi)];
  const F = G.frameOf([0, PLATE.y0, AXLE_Z], [0, 1, 0], u, v);
  const reach = POST_R + 2.6;
  return {
    bridge: G.prismOf(
      F,
      [
        [-reach, -2.8],
        [reach, -2.8],
        [reach, 2.8],
        [-reach, 2.8],
      ],
      0,
      PLATE.y1 - PLATE.y0,
      P,
    ),
    bridgeBolts: [POST_R, -POST_R].map((r) => at(G.pointOf(F, PLATE.y1 - PLATE.y0, r, 0))),
  };
}

/** Everything that turns, at these angles (radians about each part's own axis). */
export function frameOf(a: Angles): Frame {
  const d: Vec = [Math.cos(a.carrier), 0, Math.sin(a.carrier)];
  const cage: CageItem[] = [];

  // the cross pin, in two halves so each sorts on its own side of the middle
  for (const [key, dir] of [
    ["pin-a", d],
    ["pin-b", [-d[0], 0, -d[2]] as Vec],
  ] as const) {
    const F = G.frameAlong(CENTRE, dir);
    cage.push({
      key,
      depth: depthOf([dir[0] * 6, 0, AXLE_Z + dir[2] * 6], P),
      paths: G.disc(0, SPIDER.at + SPIDER.len + 1.4, 1.6, F, P),
    });
  }

  // a spider gear on each end of the pin, spinning on it
  for (const [key, sign] of [
    ["spider-a", 1],
    ["spider-b", -1],
  ] as const) {
    const axis: Vec = [d[0] * sign, 0, d[2] * sign];
    const F = G.frameOf(CENTRE, axis, [0, 1, 0], cross(axis, [0, 1, 0]));
    const mid = SPIDER.at + SPIDER.len / 2;
    cage.push({
      key,
      depth: depthOf([axis[0] * mid, 0, AXLE_Z + axis[2] * mid], P),
      paths: G.solidOf(
        [
          [SPIDER.at, SPIDER.r - 1.8],
          [SPIDER.at + SPIDER.len, SPIDER.r],
        ],
        F,
        P,
      ),
      teeth: G.ribsOf(F, SPIDER.at, SPIDER.at + SPIDER.len, SPIDER.r - 1.8, 10, P, {
        phase: a.spiders * sign,
        r1: SPIDER.r,
        fade: FADE,
      }),
      // only when the back faces us; otherwise the cone hides it
      face: depthOf(axis, P) > 0.05 ? G.circleOf(F, SPIDER.at + SPIDER.len, 2.4, P, 24) : "",
    });
  }

  // the two posts that tie the ring gear to the cage plate, turning with them
  for (const [key, offset] of [
    ["post-a", Math.PI / 2],
    ["post-b", -Math.PI / 2],
  ] as const) {
    const angle = a.carrier + offset;
    const x = POST_R * Math.cos(angle);
    const z = AXLE_Z + POST_R * Math.sin(angle);
    cage.push({
      key,
      depth: depthOf([x, 0, z], P),
      paths: G.disc(
        RING.y1,
        PLATE.y0,
        1.8,
        G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        P,
      ),
    });
  }

  return {
    ringTeeth: G.ribsOf(AXLE, RING.y0, RING.y1, RING.r, 60, P, { phase: a.carrier, fade: FADE }),
    ringBolts: G.dotsOf(AXLE, RING.y1, 19.5, 6, P, { phase: a.carrier, all: true }),
    ...bridgeOf(a.carrier),
    cage,
    pinionTeeth: G.ribsOf(INPUT, 0, 4, 4.2, 13, P, { phase: a.pinion, r1: PINION.r, fade: FADE }),
    treadNear: G.ribsOf(AXLE, WHEEL.y0 + 1, WHEEL.y1 - 1, WHEEL.r, 36, P, {
      phase: a.left,
      fade: FADE,
      seams: true,
    }),
    treadFar: G.ribsOf(AXLE, -WHEEL.y1 + 1, -WHEEL.y0 - 1, WHEEL.r, 36, P, {
      phase: a.right,
      fade: FADE,
      seams: true,
    }),
    // from the hub ring out to the rim's edge
    spokesNear: spokes(AXLE, WHEEL.y1 + 1.2, 5, 15, 5, a.left, P),
    spokesFar: spokes(AXLE, -WHEEL.y0 + 1.2, 5, 15, 5, a.right, P),
  };
}

/** The side gears' teeth turn with their wheels; they never change order with each other. */
export function sideTeeth(a: Angles) {
  return {
    near: G.ribsOf(AXLE, SIDE.at - 3, SIDE.at + 0.5, SIDE.r - 2.6, 16, P, {
      phase: a.left,
      r1: SIDE.r,
      fade: FADE,
    }),
    far: G.ribsOf(AXLE_BACK, SIDE.at - 3, SIDE.at + 0.5, SIDE.r - 2.6, 16, P, {
      phase: -a.right,
      r1: SIDE.r,
      fade: FADE,
    }),
  };
}

export const SIDE_DEPTH = {
  near: depthOf([0, SIDE.at, AXLE_Z], P),
  far: depthOf([0, -SIDE.at, AXLE_Z], P),
};
