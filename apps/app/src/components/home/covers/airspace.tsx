import * as React from "react";
import {
  circleRing,
  corners,
  cylinder,
  depthOf,
  fitProjection,
  haloOf,
  insetPlan,
  iso,
  onTop,
  pathOf,
  planOutline,
  ring,
  segment,
  slabOf,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { Dots, Line, Solid } from "@/components/iso/react/draw";

/**
 * The cover of "Flying legally in South Florida": a desk model of an airport under its
 * "upside-down wedding cake" of controlled airspace (a core from the ground up, then wider shelves
 * with higher floors, all under one ceiling), drawn as tinted glass, and a club field outside it
 * where the trainer flies, lit. Drawn only for the cover file (draw.tsx); no page imports it.
 */

export const WIDTH = 400;
export const HEIGHT = 302;
const AZIMUTH = 62;
const A = (AZIMUTH * Math.PI) / 180;

type Vec = [number, number, number];

/* ------------------------------------------------------------------ the world */

const BASE: Plan = { x: -114, y: -66, w: 196, d: 128, r: 8 };
const BASE_H = 7;
const FOOT_H = 4;

/** The airport, and its airspace: radius and floor of each tier, under one ceiling. */
const AIRPORT: Plane = [-52, -2];
const TIERS = [
  { r: 26, floor: 0 },
  { r: 44, floor: 20 },
  { r: 60, floor: 38 },
];
const CEILING = 58;

/** The club field, well outside the outer shelf, and the trainer circling over it. */
const FIELD: Plane = [48, -8];
const PLANE_AT: Vec = [44, -12, 44];

const P = fitProjection(
  [
    ...[BASE.x, BASE.x + BASE.w].flatMap((x) =>
      [BASE.y, BASE.y + BASE.d].map((y): Point3 => [x, y, -BASE_H - FOOT_H]),
    ),
    ...circleRing(AIRPORT[0], AIRPORT[1], TIERS[2]!.r, 24).map(([x, y]): Point3 => [x, y, CEILING]),
    [PLANE_AT[0], PLANE_AT[1], PLANE_AT[2] + 10],
  ],
  WIDTH,
  HEIGHT,
  { pad: 8, azimuth: AZIMUTH },
);

const at = (point: Point3) => iso(point, P);
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const top = (points: Plane[], z: number, closed = false) => onTop(points, z, P, closed);
const box = (plan: Plan, z: number, height: number, bevel = 0) =>
  slabOf(plan, z, height, P, 3, bevel);

/* ------------------------------------------------------------------- the base */

const LABEL: Plan = { x: BASE.x + 12, y: BASE.y + BASE.d - 16, w: 36, d: 9, r: 1.5 };

const base = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P),
  feet: corners(BASE, 15).map(([x, y]) => cylinder(x, y, 5, -BASE_H - FOOT_H, FOOT_H, P, 24)),
  slab: slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4),
  groove: planOutline(insetPlan(BASE, 4), 0, P),
  screwRings: join(corners(BASE, 8).map(([x, y]) => ring(x, y, 2, 0, P, 16))),
  screws: dots(corners(BASE, 8).map(([x, y]) => [x, y, 0])),
  label: box(LABEL, 0, 0.8),
  labelLine: planOutline(insetPlan(LABEL, 1.3), 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      top(
        [
          [LABEL.x + 3.6, LABEL.y + 2.5 + row * 2],
          [LABEL.x + (row === 1 ? 18 : 27), LABEL.y + 2.5 + row * 2],
        ],
        0.8,
      ),
    ),
  ),
};

/** A compass rose engraved in the base's back corner, its needle pointing north (-y). */
const NORTH: Plane = [BASE.x + BASE.w - 22, BASE.y + 20];
const north = {
  rose: join([7, 9].map((r) => ring(NORTH[0], NORTH[1], r, 0, P, 36))),
  needle: top(
    [
      [NORTH[0], NORTH[1] - 6.4],
      [NORTH[0] + 2.2, NORTH[1] + 1.8],
      [NORTH[0], NORTH[1] + 0.6],
      [NORTH[0] - 2.2, NORTH[1] + 1.8],
    ],
    0,
    true,
  ),
  ticks: join(
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const r1 = i % 2 === 0 ? 11.5 : 10.2;
      return top(
        [
          [NORTH[0] + Math.cos(a) * 9, NORTH[1] + Math.sin(a) * 9],
          [NORTH[0] + Math.cos(a) * r1, NORTH[1] + Math.sin(a) * r1],
        ],
        0,
      );
    }),
  ),
};

/* ---------------------------------------------------------------- the airport */

const [ax, ay] = AIRPORT;
const DECK: Plan = { x: ax - 33, y: ay - 22, w: 66, d: 42, r: 3 };
const DZ = 1.4;
// Two parallel runways along x (9 and 27), a taxiway between them.
const RUNWAYS: Plan[] = [-10, 6].map((dy) => ({
  x: ax - 29,
  y: ay + dy - 3,
  w: 58,
  d: 6,
  r: 0.5,
}));
const TAXI: Plan = { x: ax - 24, y: ay - 3.2, w: 48, d: 2.4, r: 1.2 };
const RZ = DZ + 0.5;

const runwayMarks = RUNWAYS.map((runway) => {
  const cy = runway.y + runway.d / 2;
  const x0 = runway.x;
  const x1 = runway.x + runway.w;
  const centre: string[] = [];
  for (let x = x0 + 10; x < x1 - 12; x += 5.5) {
    centre.push(
      top(
        [
          [x, cy],
          [x + 2.8, cy],
        ],
        RZ,
      ),
    );
  }
  const keys: string[] = [];
  for (const end of [x0 + 1.6, x1 - 4.8]) {
    for (const k of [-2, -1, 1, 2]) {
      keys.push(
        top(
          [
            [end, cy + k * 1.05],
            [end + 3.2, cy + k * 1.05],
          ],
          RZ,
        ),
      );
    }
  }
  const aim = [x0 + 12, x1 - 15].map((x) =>
    join(
      [-1.5, 1.5].map((dy) =>
        top(
          [
            [x, cy + dy],
            [x + 3, cy + dy],
          ],
          RZ,
        ),
      ),
    ),
  );
  return { centre: join(centre), keys: join(keys), aim: join(aim) };
});

// Connectors from the taxiway to each runway.
const LINKS: Plan[] = [-18, 0, 18].flatMap((dx) => [
  { x: ax + dx - 1.2, y: ay - 7.4, w: 2.4, d: 4.6, r: 0 },
  { x: ax + dx - 1.2, y: ay - 1, w: 2.4, d: 4.2, r: 0 },
]);

// Terminal, apron and tower behind the north runway (smaller y is further back on screen).
const APRON: Plan = { x: ax - 18, y: ay - 19, w: 40, d: 4.6, r: 0.5 };
const TERMINAL: Plan = { x: ax - 16, y: ay - 21, w: 22, d: 5, r: 0.5 };
const TOWER: Plane = [ax + 18, ay - 17];
const HANGAR_Y = ay + 10.5;
const HANGARS = [ax - 28, ax - 19];

/** A hangar: a gabled shed along y, its door on the front gable. */
function hangarOf(x: number) {
  const F = G.frameOf([x, HANGAR_Y, DZ], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const w = 7.4;
  const length = 7.6;
  return {
    body: G.prismOf(
      F,
      [
        [0, 0],
        [w, 0],
        [w, 3.4],
        [w / 2, 5.8],
        [0, 3.4],
      ],
      0,
      length,
      P,
    ),
    door: pathOf(
      (
        [
          [x + 1.4, 0],
          [x + 1.4, 3],
          [x + w - 1.4, 3],
          [x + w - 1.4, 0],
        ] as const
      ).map(([px, z]) => at([px, HANGAR_Y + length, DZ + z])),
    ),
    seams: join(
      [2.5, 5].map((s) =>
        pathOf(
          (
            [
              [w, 3.4],
              [w / 2, 5.8],
              [0, 3.4],
            ] as const
          ).map(([u, v]) => at([x + u, HANGAR_Y + s, DZ + v])),
        ),
      ),
    ),
  };
}

const airport = {
  deck: box(DECK, 0, DZ, 0.4),
  deckGroove: planOutline(insetPlan(DECK, 2), DZ, P),
  runways: RUNWAYS.map((plan) => box(plan, DZ, RZ - DZ)),
  marks: runwayMarks,
  taxi: box(TAXI, DZ, 0.25),
  taxiLine: top(
    [
      [TAXI.x + 2, TAXI.y + TAXI.d / 2],
      [TAXI.x + TAXI.w - 2, TAXI.y + TAXI.d / 2],
    ],
    DZ + 0.25,
  ),
  links: LINKS.map((plan) => box(plan, DZ, 0.25)),
  apron: box(APRON, DZ, 0.25),
  stands: join(
    [0, 1, 2, 3].map((i) =>
      top(
        [
          [APRON.x + 24 + i * 4, APRON.y + 0.8],
          [APRON.x + 24 + i * 4, APRON.y + APRON.d - 0.8],
        ],
        DZ + 0.25,
      ),
    ),
  ),
  terminal: box(TERMINAL, DZ, 5, 0.3),
  terminalRoof: box(insetPlan(TERMINAL, -0.7), DZ + 5, 0.9, 0.3),
  terminalGlass: segment(
    [TERMINAL.x + 1.2, TERMINAL.y + TERMINAL.d, DZ + 3.2],
    [TERMINAL.x + TERMINAL.w - 1.2, TERMINAL.y + TERMINAL.d, DZ + 3.2],
    P,
  ),
  terminalMullions: join(
    Array.from({ length: 7 }, (_, i) => {
      const x = TERMINAL.x + 2.5 + i * 2.8;
      return segment(
        [x, TERMINAL.y + TERMINAL.d, DZ + 1.2],
        [x, TERMINAL.y + TERMINAL.d, DZ + 4.2],
        P,
      );
    }),
  ),
  towerFoot: box({ x: TOWER[0] - 3.4, y: TOWER[1] - 3.4, w: 6.8, d: 6.8, r: 0.5 }, DZ, 2.6, 0.3),
  towerShaft: cylinder(TOWER[0], TOWER[1], 1.8, DZ + 2.6, 13, P, 24),
  towerDeck: cylinder(TOWER[0], TOWER[1], 4, DZ + 15.6, 0.9, P, 8),
  towerCab: cylinder(TOWER[0], TOWER[1], 3.4, DZ + 16.5, 3.2, P, 8),
  towerRoof: cylinder(TOWER[0], TOWER[1], 4.1, DZ + 19.7, 0.8, P, 8),
  towerMast: segment([TOWER[0], TOWER[1], DZ + 20.5], [TOWER[0], TOWER[1], DZ + 25], P),
  towerTip: at([TOWER[0], TOWER[1], DZ + 25]),
  towerPanes: join(
    circleRing(TOWER[0], TOWER[1], 3.4, 8)
      .filter(([x, y]) => depthOf([x, y, 0], P) >= depthOf([TOWER[0], TOWER[1], 0], P) - 0.5)
      .map(([x, y]) => segment([x, y, DZ + 16.5], [x, y, DZ + 19.7], P)),
  ),
  hangars: HANGARS.map(hangarOf),
};

/* --------------------------------------------------------------- the airspace */

/** Points round a ring of the airspace, from angle `a0` to `a1` (radians, about the airport). */
const arc = (r: number, z: number, a0: number, a1: number, steps = 36): Flat[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return at([ax + Math.cos(a) * r, ay + Math.sin(a) * r, z]);
  });

// The model is cut in half on the plane square to the viewer, as a section is drawn: the front
// half is gone (left as phantom lines), so the cut face shows the whole stepped profile.
const BACK: [number, number] = [A + Math.PI / 2, A + (Math.PI * 3) / 2];
const FRONT: [number, number] = [A - Math.PI / 2, A + Math.PI / 2];
const OUTER = TIERS[2]!.r;
/** A point on the cut plane: `r` across it (negative to the left), `z` up. */
const onCut = (r: number, z: number): Point3 => [
  ax + Math.cos(A + Math.PI / 2) * r,
  ay + Math.sin(A + Math.PI / 2) * r,
  z,
];

/** The stepped profile, radius and height, from the airport out: the "upside-down wedding cake". */
const HALF: Array<[number, number]> = TIERS.flatMap(
  ({ r, floor }, index): Array<[number, number]> => [
    [r, floor],
    [r, TIERS[index + 1]?.floor ?? CEILING],
  ],
);
const PROFILE = [...[...HALF].reverse().map(([r, z]): [number, number] => [-r, z]), ...HALF];

const sky = {
  section: pathOf(
    PROFILE.map(([r, z]) => at(onCut(r, z))),
    true,
  ),
  // Thin rules across the cut face where one tier's floor meets the tier inside it.
  rules: join(
    TIERS.slice(1).map(({ floor }, index) =>
      segment(onCut(-TIERS[index]!.r, floor), onCut(TIERS[index]!.r, floor), P),
    ),
  ),
  axis: segment([ax, ay, 0], [ax, ay, CEILING], P),
  floorsBack: join(TIERS.map(({ r, floor }) => pathOf(arc(r, floor, ...BACK)))),
  // What was cut away, as phantom lines: the front of each floor and of the ceiling.
  phantom: join([
    ...TIERS.map(({ r, floor }) => pathOf(arc(r, floor, ...FRONT))),
    pathOf(arc(OUTER, CEILING, ...FRONT)),
  ]),
  lidGlass: pathOf(arc(OUTER, CEILING, ...BACK, 48), true),
  lidRing: pathOf(arc(OUTER, CEILING, ...BACK, 48)),
  // The inner tiers' edges, traced on the ceiling the way a chart prints them.
  lidRings: join(TIERS.slice(0, 2).map(({ r }) => pathOf(arc(r, CEILING, ...BACK)))),
  lidTicks: join(
    Array.from({ length: 21 }, (_, i) => {
      const a = BACK[0] + 0.1 + ((BACK[1] - BACK[0] - 0.2) * i) / 20;
      const c = Math.cos(a);
      const n = Math.sin(a);
      return segment(
        [ax + c * OUTER, ay + n * OUTER, CEILING],
        [ax + c * (OUTER - 3), ay + n * (OUTER - 3), CEILING],
        P,
      );
    }),
  ),
};

/* ------------------------------------------------------------------- trees */

const TREES: Array<[number, number, number]> = [
  [18, 42, 5.4],
  [27, 50, 4.2],
  [74, 48, 4.6],
  [-92, 28, 5],
  [-6, 52, 4.4],
];

/** A county road between the airport and the field, the field's drive, and a lake (Florida). */
const ROAD: Plan = { x: 2, y: BASE.y + 6, w: 6, d: BASE.d - 12, r: 0.4 };
const DRIVE: Plan = {
  x: ROAD.x + ROAD.w,
  y: FIELD[1] + 22,
  w: FIELD[0] - 32 - ROAD.x - ROAD.w,
  d: 3.4,
  r: 0,
};
const LAKE: Plan = { x: -60, y: 38, w: 40, d: 18, r: 8 };
const ground = {
  road: box(ROAD, 0, 0.3),
  roadLine: top(
    [
      [ROAD.x + ROAD.w / 2, ROAD.y + 3],
      [ROAD.x + ROAD.w / 2, ROAD.y + ROAD.d - 3],
    ],
    0.3,
  ),
  drive: box(DRIVE, 0, 0.3),
  lake: box(LAKE, 0, 0.3),
  shore: planOutline(insetPlan(LAKE, 2), 0.3, P),
  ripples: join(
    (
      [
        [-48, 44, 8],
        [-36, 48, 10],
        [-44, 51, 6],
      ] as const
    ).map(([x, y, w]) =>
      top(
        [
          [x, y],
          [x + w, y],
        ],
        0.3,
      ),
    ),
  ),
};
const trees = TREES.map(([x, y, r]) => ({
  trunk: cylinder(x, y, 0.9, 0, r * 0.9, P, 12),
  crown: G.sphereOf([x, y, r * 0.9 + r * 0.8], r, P),
}));

/* ------------------------------------------------------------ the club field */

const [fx, fy] = FIELD;
const STRIP: Plan = { x: fx - 24, y: fy - 5, w: 48, d: 10, r: 1 };
const FENCE_Y = fy + 9;
const FENCE_XS = Array.from({ length: 8 }, (_, i) => fx - 21 + i * 6);
const PITS: Plan = { x: fx - 20, y: fy + 12, w: 34, d: 9, r: 1 };
const SHELTER: Plan = { x: fx - 4, y: fy + 26, w: 13, d: 7, r: 0.4 };
const SOCK: Plane = [fx + 30, fy + 10];
const SOCK_DIR: Vec = [0.8, -0.6, 0];

const field = {
  grass: box({ x: fx - 32, y: fy - 22, w: 64, d: 56, r: 4 }, 0, 0.5),
  strip: box(STRIP, 0.5, 0.5),
  stripGroove: planOutline(insetPlan(STRIP, 1.4), 1, P),
  stripCentre: top(
    [
      [STRIP.x + 4, fy],
      [STRIP.x + STRIP.w - 4, fy],
    ],
    1,
  ),
  pits: box(PITS, 0.5, 0.5),
  pitLines: join(
    [1, 2, 3].map((i) =>
      top(
        [
          [PITS.x + i * 8.5, PITS.y + 1.3],
          [PITS.x + i * 8.5, PITS.y + PITS.d - 1.3],
        ],
        1,
      ),
    ),
  ),
  posts: FENCE_XS.map((x) => cylinder(x, FENCE_Y, 0.6, 0.5, 4.5, P, 12)),
  rails: join(
    [2.6, 4.6].map((z) => segment([FENCE_XS[0]!, FENCE_Y, z], [FENCE_XS.at(-1)!, FENCE_Y, z], P)),
  ),
  shelterPosts: corners(SHELTER, 0.8).map(([x, y]) => cylinder(x, y, 0.5, 0.5, 6, P, 10)),
  shelterBench: box(
    { x: SHELTER.x + 1.4, y: SHELTER.y + SHELTER.d - 2.6, w: SHELTER.w - 2.8, d: 1.6, r: 0.2 },
    2.6,
    0.7,
  ),
  shelterRoof: box(insetPlan(SHELTER, -1.3), 6.5, 1, 0.3),
  sockPole: cylinder(SOCK[0], SOCK[1], 0.5, 0.5, 14, P, 10),
  sock: G.prismOf(
    G.frameOf([SOCK[0], SOCK[1], 12.6], SOCK_DIR, [0, 0, 1], [0.6, 0.8, 0]),
    [
      [-1.4, -1.4],
      [1.4, -1.4],
      [1.4, 1.4],
      [-1.4, 1.4],
    ],
    0.6,
    7,
    P,
  ),
  sockBands: join(
    [2.7, 4.8].map((s) => {
      const c: Vec = [SOCK[0] + SOCK_DIR[0] * s, SOCK[1] + SOCK_DIR[1] * s, 12.6];
      return pathOf(
        (
          [
            [-1.4, 1.4],
            [1.4, 1.4],
            [1.4, -1.4],
          ] as const
        ).map(([u, v]) => at([c[0] + 0.6 * v, c[1] + 0.8 * v, c[2] + u])),
      );
    }),
  ),
  // The pattern the trainer flies, traced on the grass: a racetrack round the strip.
  circuit: top(
    Array.from({ length: 61 }, (_, i): Plane => {
      const a = (i / 60) * Math.PI * 2;
      return [fx + 3 + Math.cos(a) * 30, fy - 4 + Math.sin(a) * 15];
    }),
    0.5,
  ),
};

/* ------------------------------------------------------------- the trainer */

const [px, py, pz] = PLANE_AT;
const fuselageFrame = G.frameOf([px, py, pz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const STAND: Plane = [px + 2, py];

const trainer = {
  standFoot: cylinder(STAND[0], STAND[1], 3, 1, 1, P, 20),
  stand: cylinder(STAND[0], STAND[1], 0.8, 2, pz - 2.6 - 2, P, 12),
  fuselage: G.prismOf(
    fuselageFrame,
    [
      [-2.4, -2.6],
      [2.4, -2.6],
      [2.4, 2.2],
      [1.6, 3],
      [-1.6, 3],
      [-2.4, 2.2],
    ],
    -12,
    10,
    P,
  ),
  tailBoom: G.prismOf(
    fuselageFrame,
    [
      [-1.3, -0.6],
      [1.3, -0.6],
      [1.3, 2.4],
      [-1.3, 2.4],
    ],
    -28,
    -12,
    P,
  ),
  cowl: G.prismOf(
    fuselageFrame,
    [
      [-2.1, -2.1],
      [2.1, -2.1],
      [2.1, 1.9],
      [-2.1, 1.9],
    ],
    10,
    12.6,
    P,
  ),
  canopy: G.prismOf(
    fuselageFrame,
    [
      [-1.5, 3],
      [1.5, 3],
      [1.1, 4.4],
      [-1.1, 4.4],
    ],
    1,
    6,
    P,
  ),
  wing: box({ x: px - 3, y: py - 21, w: 8.5, d: 42, r: 1.2 }, pz + 3, 1.3, 0.3),
  aileronSeams: join(
    [-1, 1].map((side) =>
      top(
        [
          [px - 1.2, py + side * 8],
          [px - 1.2, py + side * 19.5],
        ],
        pz + 4.3,
      ),
    ),
  ),
  tailplane: box({ x: px - 30, y: py - 8, w: 5, d: 16, r: 0.8 }, pz + 1.8, 0.7),
  fin: G.prismOf(
    G.frameOf([px, py, pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
    [
      [-30, 2.4],
      [-25.5, 2.4],
      [-28.4, 8.6],
      [-30, 8.6],
    ],
    -0.45,
    0.45,
    P,
  ),
  prop: segment([px + 13, py - 6.5, pz + 0.2], [px + 13, py + 6.5, pz + 0.2], P),
  hub: at([px + 13, py, pz + 0.2]),
  gear: join(
    [-1, 1].map((side) =>
      segment([px + 5, py + side * 1.6, pz - 2.6], [px + 6, py + side * 4.2, pz - 6.6], P),
    ),
  ),
  wheels: [-1, 1].map((side) => at([px + 6, py + side * 4.2, pz - 6.6])),
};

/* ------------------------------------------------------------------ drawing */

const S = ({ paths, tone = "mid", lit }: { paths: SolidPaths; tone?: Tone; lit?: boolean }) => (
  <Solid paths={paths} tone={tone} crease="faint" lit={lit} />
);

/** Glass seen from in front: a pale tint over what is behind it. */
const Glass = ({
  d,
  shade = 2,
  opacity = 0.32,
}: {
  d: string;
  shade?: number;
  opacity?: number;
}) => <path className="iso-shade" data-shade={shade} d={d} fillOpacity={opacity} />;

export function AirspaceArt() {
  const m = airport.marks;
  return (
    <g>
      <path className="iso-halo" d={base.halo} />
      {base.feet.map((paths, index) => (
        <S key={index} paths={paths} tone="lo" />
      ))}
      <S paths={base.slab} />
      <Line d={base.groove} tone="lo" />
      <Line d={base.screwRings} tone="lo" />
      <Dots points={base.screws} size={0.5} tone="mid" />
      <Solid paths={base.label} tone="lo" crease="none" />
      <Line d={base.labelLine} tone="faint" />
      <Line d={base.labelRule} tone="lo" free />
      <Line d={north.rose} tone="lo" />
      <Line d={north.ticks} tone="lo" />
      <Line d={north.needle} tone="mid" />

      {/* the far half of the airspace: its floors, seen through the glass */}
      <Line d={sky.floorsBack} tone="lo" dashed />

      {/* the road, the drive and the lake */}
      <S paths={ground.road} tone="lo" />
      <Line d={ground.roadLine} tone="lo" dashed />
      <S paths={ground.drive} tone="lo" />
      <S paths={ground.lake} tone="lo" />
      <Line d={ground.shore} tone="faint" />
      <Line d={ground.ripples} tone="lo" free />

      {/* the club field */}
      <S paths={field.grass} tone="lo" />
      <Line d={field.circuit} tone="mid" dotted />
      <S paths={field.strip} tone="lo" />
      <Line d={field.stripGroove} tone="faint" />
      <Line d={field.stripCentre} tone="lo" dashed />
      <S paths={trainer.standFoot} tone="lo" />
      <S paths={trainer.stand} tone="lo" />
      {field.posts.map((paths, i) => (
        <S key={i} paths={paths} tone="lo" />
      ))}
      <Line d={field.rails} tone="lo" />
      <S paths={field.pits} tone="lo" />
      <Line d={field.pitLines} tone="faint" />
      {field.shelterPosts.map((paths, i) => (
        <S key={i} paths={paths} tone="lo" />
      ))}
      <S paths={field.shelterBench} tone="lo" />
      <S paths={field.shelterRoof} />
      <S paths={field.sockPole} tone="lo" />
      <Solid
        paths={field.sock}
        tone="mid"
        crease="faint"
        inner={<Line d={field.sockBands} tone="lo" />}
      />

      {/* the airport */}
      <S paths={airport.deck} tone="lo" />
      <Line d={airport.deckGroove} tone="faint" />
      <S paths={airport.apron} tone="lo" />
      <Line d={airport.stands} tone="faint" />
      {airport.links.map((paths, i) => (
        <S key={i} paths={paths} tone="lo" />
      ))}
      <S paths={airport.taxi} tone="lo" />
      <Line d={airport.taxiLine} tone="faint" />
      {airport.runways.map((paths, i) => (
        <g key={i}>
          <S paths={paths} />
          <Line d={m[i]!.centre} tone="lo" />
          <Line d={m[i]!.keys} tone="mid" />
          <Line d={m[i]!.aim} tone="mid" />
        </g>
      ))}
      <S paths={airport.terminal} />
      <Line d={airport.terminalMullions} tone="faint" />
      <Line d={airport.terminalGlass} tone="lo" />
      <S paths={airport.terminalRoof} />
      <S paths={airport.towerFoot} tone="lo" />
      <S paths={airport.towerShaft} />
      <S paths={airport.towerDeck} tone="lo" />
      <S paths={airport.towerCab} />
      <Line d={airport.towerPanes} tone="faint" />
      <S paths={airport.towerRoof} />
      <Line d={airport.towerMast} tone="mid" />
      <Dots points={[airport.towerTip]} size={0.8} tone="hi" />
      {/* the near half is cut away: the section, the ceiling behind it, then the hangars in front */}
      <Glass d={sky.lidGlass} shade={3} opacity={0.3} />
      <Line d={sky.lidRings} tone="faint" dashed />
      <Line d={sky.lidTicks} tone="lo" />
      <Line d={sky.lidRing} tone="mid" />
      <Glass d={sky.section} shade={1} opacity={0.42} />
      <Line d={sky.rules} tone="faint" dashed />
      <Line d={sky.axis} tone="faint" dashed />
      <Line d={sky.section} tone="mid" />
      {airport.hangars.map((hangar, i) => (
        <g key={i}>
          <Solid
            paths={hangar.body}
            tone="mid"
            crease="faint"
            inner={<Line d={hangar.seams} tone="faint" />}
          />
          <Line d={hangar.door} tone="lo" />
        </g>
      ))}
      <Line d={sky.phantom} tone="faint" dashed />

      {/* trees, in front of the glass where they stand */}
      {trees.map((tree, i) => (
        <g key={i}>
          <S paths={tree.trunk} tone="lo" />
          <S paths={tree.crown} tone="lo" />
        </g>
      ))}

      {/* the trainer, lit */}
      <S paths={trainer.tailplane} tone="hi" lit />
      <S paths={trainer.tailBoom} tone="hi" lit />
      <S paths={trainer.fin} tone="hi" lit />
      <Line d={trainer.gear} tone="hi" />
      <Dots points={trainer.wheels} size={0.7} tone="hi" />
      <S paths={trainer.fuselage} tone="hi" lit />
      <S paths={trainer.canopy} tone="hi" lit />
      <S paths={trainer.cowl} tone="hi" lit />
      <S paths={trainer.wing} tone="hi" lit />
      <Line d={trainer.aileronSeams} tone="hi" />
      <Line d={trainer.prop} tone="hi" />
      <Dots points={[trainer.hub]} size={0.8} tone="hi" />
    </g>
  );
}
