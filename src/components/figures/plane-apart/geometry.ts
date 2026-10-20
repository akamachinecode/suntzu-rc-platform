import {
  corners,
  cylinder,
  extrude,
  haloOf,
  insetPlan,
  onTop,
  planOutline,
  ring,
  slabOf,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
} from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { TRAINER, UNIT } from "./model";
import {
  AILERON,
  CABIN,
  CHORD,
  ELEVATOR_CHORD,
  FIN_LE,
  HALF_FRONT,
  HALF_SPAN,
  HATCH,
  NOSE_X,
  P,
  POST_X,
  PROP_R,
  SPINNER_R,
  STAB_CHORD,
  STAB_HALF,
  STAB_LE,
  STAND,
  STAND_TOP,
  TAIL_BOTTOM,
  TAIL_X,
  TOP_Z,
  WALL,
  WING_LE,
  at,
  halfWidthAt,
} from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const dots = (points: Point3[]): Flat[] => points.map(at);
const join = (paths: string[]) => paths.join("");
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/* ------------------------------------------------------------------ stand */

const STAND_FEET = corners(STAND, 14);
const POST_TOP = -9;
const YOKE: Plan = { x: POST_X - 7, y: -16, w: 14, d: 32, r: 2 };
const PADS: Plan[] = [-1, 1].map((side) => ({
  x: POST_X - 6,
  y: side * 10 - 3,
  w: 12,
  d: 6,
  r: 1.5,
}));
const STAND_LABEL: Plan = { x: STAND.x + 10, y: STAND.y + STAND.d - 20, w: 40, d: 10, r: 1.5 };

export const STAND_ART = {
  halo: haloOf(STAND, STAND_TOP - 12, 8, P),
  feet: STAND_FEET.map(([x, y]) => cylinder(x, y, 6, STAND_TOP - 12, 4, P, 24)),
  base: slabOf(STAND, STAND_TOP - 8, 8, P, 8, 1.4),
  groove: planOutline(insetPlan(STAND, 4.5), STAND_TOP, P),
  screws: dots(corners(STAND, 8).map(([x, y]) => [x, y, STAND_TOP])),
  screwRings: join(corners(STAND, 8).map(([x, y]) => ring(x, y, 2.2, STAND_TOP, P, 16))),
  label: slabOf(STAND_LABEL, STAND_TOP, 0.8, P, 3),
  labelLine: planOutline(insetPlan(STAND_LABEL, 1.4), STAND_TOP + 0.8, P),
  labelRule: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [STAND_LABEL.x + 5, STAND_LABEL.y + 3 + row * 2.1],
          [STAND_LABEL.x + (row === 1 ? 22 : 31), STAND_LABEL.y + 3 + row * 2.1],
        ],
        STAND_TOP + 0.8,
        P,
      ),
    ),
  ),
  collar: cylinder(POST_X, 0, 7, STAND_TOP, 4, P, 32),
  post: cylinder(POST_X, 0, 3.6, STAND_TOP + 4, POST_TOP - 3 - STAND_TOP - 4, P, 28),
  clamp: slabOf({ x: POST_X - 5, y: -5, w: 10, d: 10, r: 1.5 }, STAND_TOP + 30, 8, P, 3, 0.5),
  knob: G.disc(5, 9, 3, G.frameAlong([POST_X, 0, STAND_TOP + 34], Y), P),
  yoke: slabOf(YOKE, POST_TOP - 3, 3, P, 3, 0.5),
  pads: PADS.map((pad) => slabOf(pad, POST_TOP, -POST_TOP, P, 3)),
};

/* --------------------------------------------------------------- fuselage */

/** One side of the box, as a prism in the plane of that side. */
function wallOf(side: 1 | -1) {
  const front: Vec = [NOSE_X, side * HALF_FRONT, 0];
  const back: Vec = [TAIL_X, side * halfWidthAt(TAIL_X), 0];
  const u = unit([back[0] - front[0], back[1] - front[1], 0]);
  const length = Math.hypot(back[0] - front[0], back[1] - front[1]);
  const out = cross(u, Z); // +y side for the near wall
  const outward = out[1] * side > 0 ? 1 : -1;
  const F = G.frameOf(front, outward > 0 ? out : ([-out[0], -out[1], -out[2]] as Vec), u, Z);
  const bellyAt = NOSE_X - CABIN.from;
  const profile: Array<[number, number]> = [
    [0, 0],
    [bellyAt, 0],
    [length, TAIL_BOTTOM],
    [length, TOP_Z],
    [0, TOP_Z],
  ];
  // The prism runs inward from the outer face.
  return { paths: G.prismOf(F, profile, -WALL, 0, P), F, length };
}

const NEAR_WALL = wallOf(1);
const FAR_WALL = wallOf(-1);

/** A closed window outline on the near side, like the painted windows on a trainer. */
function windowOutline() {
  const { F } = NEAR_WALL;
  const shape: Array<[number, number]> = [
    [14, 18],
    [52, 18],
    [58, 30],
    [20, 30],
  ];
  const pts = shape.map(([u, v]) =>
    at([0, 1, 2].map((i) => F.o[i]! + F.a[i]! * 0.05 + F.u[i]! * u + F.v[i]! * v) as Point3),
  );
  return `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

const inner = (x: number) => halfWidthAt(x) - WALL;
const floorRing: Plane[] = [
  [CABIN.from, -inner(CABIN.from)],
  [NOSE_X - WALL, -inner(NOSE_X - WALL)],
  [NOSE_X - WALL, inner(NOSE_X - WALL)],
  [CABIN.from, inner(CABIN.from)],
];
const deckRing = (from: number, to: number): Plane[] => [
  [from, -inner(from)],
  [to, -inner(to)],
  [to, inner(to)],
  [from, inner(from)],
];
const formerAt = (x: number, t: number, z0: number, z1: number) =>
  G.prismOf(
    G.frameOf([x, 0, 0], [1, 0, 0], Y, Z),
    [
      [-inner(x), z0],
      [inner(x), z0],
      [inner(x), z1],
      [-inner(x), z1],
    ],
    -t,
    0,
    P,
  );

export const FUSELAGE_BACK = {
  farWall: FAR_WALL.paths,
  floor: extrude(floorRing, 0, 2, P),
  former: formerAt(CABIN.from, 2, 2, TOP_Z - 2),
  formerHole: G.circleOf(G.frameAlong([CABIN.from, 0, 18], X), 0, 6, P, 28),
};

export const FUSELAGE_FRONT = {
  nearWall: NEAR_WALL.paths,
  window: windowOutline(),
  rearDeck: extrude(deckRing(TAIL_X, CABIN.from), TOP_Z - 2, 2, P),
  frontDeck: extrude(deckRing(CABIN.to, HATCH.from), TOP_Z - 2, 2, P),
  firewall: formerAt(NOSE_X, WALL, 0, TOP_Z),
  firewallTop: extrude(deckRing(HATCH.to, NOSE_X - WALL), TOP_Z - 2, 2, P),
  tailPost: slabOf(
    { x: TAIL_X, y: -halfWidthAt(TAIL_X), w: 2, d: halfWidthAt(TAIL_X) * 2, r: 0.4 },
    TAIL_BOTTOM,
    TOP_Z - TAIL_BOTTOM,
    P,
    2,
  ),
};

const HATCH_PLAN = deckRing(HATCH.from, HATCH.to);
const CANOPY = G.prismOf(
  G.frameOf([0, 0, 0], Y, X, Z),
  [
    [HATCH.from + 1, TOP_Z],
    [HATCH.from + 22, TOP_Z],
    [HATCH.from + 6, TOP_Z + 7],
    [HATCH.from + 1, TOP_Z + 7],
  ],
  -inner(HATCH.from) + 1.5,
  inner(HATCH.from) - 1.5,
  P,
);

export const HATCH_ART = {
  plate: extrude(HATCH_PLAN, TOP_Z - 1.6, 1.6, P),
  canopy: CANOPY,
  grip: slabOf({ x: HATCH.to - 7, y: -3, w: 4, d: 6, r: 1 }, TOP_Z, 1.2, P, 3),
  magnets: dots([
    [HATCH.from + 2, 0, TOP_Z],
    [HATCH.to - 2, 0, TOP_Z],
  ]),
};

/* ---------------------------------------------------------- cabin contents */

const BATTERY: Plan = {
  x: 52,
  y: -(TRAINER.battery.width / UNIT) / 2,
  w: TRAINER.battery.length / UNIT,
  d: TRAINER.battery.width / UNIT,
  r: 1.2,
};
const BATTERY_H = TRAINER.battery.height / UNIT;
const STRAP_X = BATTERY.x + BATTERY.w / 2;

export const BATTERY_ART = {
  pack: slabOf(BATTERY, 2, BATTERY_H, P, 3, 0.5),
  strap: slabOf(
    { x: STRAP_X - 2.5, y: BATTERY.y - 0.4, w: 5, d: BATTERY.d + 0.8, r: 0.4 },
    2,
    BATTERY_H + 0.4,
    P,
    2,
  ),
  plug: slabOf({ x: BATTERY.x + BATTERY.w, y: -2.2, w: 3.4, d: 4.4, r: 0.6 }, 3, 3.2, P, 2),
  label: join(
    [0, 1, 2].map((row) =>
      onTop(
        [
          [BATTERY.x + 2.5, BATTERY.y + 2 + row * 2],
          [BATTERY.x + (row === 1 ? 7 : 9.5), BATTERY.y + 2 + row * 2],
        ],
        2 + BATTERY_H,
        P,
      ),
    ),
  ),
};

const RX: Plan = { x: 14, y: 3, w: 10, d: 7, r: 1 };
const ESC: Plan = { x: 28, y: -10, w: 12, d: 7, r: 1 };
const SERVOS: Plan[] = [
  { x: 12, y: -10, w: 6, d: 3.2, r: 0.5 },
  { x: 19.5, y: -10, w: 6, d: 3.2, r: 0.5 },
];

function finsOn(plan: Plan, z: number, count: number) {
  return join(
    Array.from({ length: count }, (_, index) => {
      const x = plan.x + ((index + 1) * plan.w) / (count + 1);
      return onTop(
        [
          [x, plan.y],
          [x, plan.y + plan.d],
        ],
        z,
        P,
      );
    }),
  );
}

export const RADIO_ART = {
  rx: slabOf(RX, 2, 4.4, P, 2, 0.4),
  rxLabel: planOutline(insetPlan(RX, 1.4), 6.4, P, 2),
  rxLed: dots([[RX.x + RX.w - 2, RX.y + RX.d - 2, 6.4]]),
  esc: slabOf(ESC, 2, 3.4, P, 2, 0.3),
  escFins: finsOn(ESC, 5.4, 5),
  servos: SERVOS.map((plan) => slabOf(plan, 2, 5.4, P, 2, 0.3)),
  splines: SERVOS.map((plan) => cylinder(plan.x + 1.8, plan.y + plan.d / 2, 1, 7.4, 0.8, P, 12)),
  arms: SERVOS.map((plan) =>
    slabOf(
      { x: plan.x + 0.4, y: plan.y + plan.d / 2 - 0.7, w: 5.2, d: 1.4, r: 0.6 },
      8.2,
      0.6,
      P,
      2,
    ),
  ),
  antennas: [
    G.solidOf(
      [
        [0, 0.35],
        [9, 0.3],
      ],
      G.frameAlong([RX.x, RX.y + 2, 4.5], [-1, 0.2, 0.15]),
      P,
    ),
    G.solidOf(
      [
        [0, 0.35],
        [9, 0.3],
      ],
      G.frameAlong([RX.x + 3, RX.y + RX.d, 4.5], [0.1, 1, 0.12]),
      P,
    ),
  ],
};

/* --------------------------------------------------------------------- wing */

/** A flat-bottom section, thickest about a quarter back: Clark Y in spirit. */
const SECTION: Array<[number, number]> = [
  [0, 0.4],
  [0.6, 2.4],
  [2.5, 4.6],
  [7, 6.4],
  [15, 7.3],
  [26, 7.0],
  [40, 4.8],
  [CHORD - AILERON.chord, 2.2],
  [CHORD - AILERON.chord, 0],
];
const SURFACE: Array<[number, number]> = [
  [CHORD - AILERON.chord + 0.5, 0],
  [CHORD - AILERON.chord + 0.5, 2.1],
  [CHORD, 0.5],
  [CHORD, 0],
];

/** One half of the wing. Its axis runs out along the span, tilted up by the dihedral. */
function wingHalf(side: 1 | -1) {
  const d = TRAINER.dihedral * RAD;
  const a: Vec = [0, side * Math.cos(d), Math.sin(d)];
  const u: Vec = [-1, 0, 0];
  const v = unit(cross(a, u)[2] > 0 ? cross(a, u) : (cross(u, a) as Vec));
  const F = G.frameOf([WING_LE, 0, TOP_Z], a, u, v);
  const point = (chord: number, height: number, span: number) =>
    at([
      F.o[0] + a[0] * span + u[0] * chord + v[0] * height,
      F.o[1] + a[1] * span + u[1] * chord + v[1] * height,
      F.o[2] + a[2] * span + u[2] * chord + v[2] * height,
    ]);
  const path = (list: Flat[]) =>
    `M${list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;
  const topAt = (chord: number) => {
    for (let i = 1; i < SECTION.length; i++) {
      const [c0, h0] = SECTION[i - 1]!;
      const [c1, h1] = SECTION[i]!;
      if (chord <= c1) return h0 + ((h1 - h0) * (chord - c0)) / (c1 - c0 || 1);
    }
    return 0;
  };
  return {
    panel: G.prismOf(F, SECTION, 0, HALF_SPAN, P),
    flap: G.prismOf(F, SURFACE, 0, AILERON.from, P),
    aileron: G.prismOf(F, SURFACE, AILERON.from + 0.6, HALF_SPAN, P),
    // A spar line and the root joint tape, each running edge to edge across the top.
    spar: path([point(16, topAt(16), 0), point(16, topAt(16), HALF_SPAN)]),
    tape: path([point(0.6, 2.4, 6), point(15, topAt(15), 6), point(CHORD - AILERON.chord, 2.2, 6)]),
    bolts: [0.25, 0.75].map((share) =>
      point(CHORD - AILERON.chord - 6, topAt(CHORD - AILERON.chord - 6), 3 + share * 2),
    ),
  };
}

export const WING_FAR = wingHalf(-1);
export const WING_NEAR = wingHalf(1);

/* --------------------------------------------------------------------- tail */

const STAB_SECTION: Array<[number, number]> = [
  [0, 0.5],
  [0.8, 2],
  [2.5, 2.6],
  [STAB_CHORD, 2.6],
  [STAB_CHORD, 0],
  [2.5, 0],
];
const ELEVATOR_SECTION: Array<[number, number]> = [
  [STAB_CHORD + 0.5, 0],
  [STAB_CHORD + 0.5, 2.6],
  [STAB_CHORD + ELEVATOR_CHORD, 1.5],
  [STAB_CHORD + ELEVATOR_CHORD, 1.0],
];
const STAB_FRAME = G.frameOf([STAB_LE, 0, TOP_Z], Y, [-1, 0, 0], Z);

const stabHalf = (s0: number, s1: number) => ({
  stab: G.prismOf(STAB_FRAME, STAB_SECTION, s0, s1, P),
  elevator: G.prismOf(STAB_FRAME, ELEVATOR_SECTION, s0, s1, P),
});

export const STAB_FAR = stabHalf(-STAB_HALF, -1);
export const STAB_NEAR = {
  ...stabHalf(1, STAB_HALF),
  // The elevator horn stands on top of the near half, a little out from the fuselage.
  horn: G.prismOf(
    G.frameOf([STAB_LE, 0, TOP_Z + 2.6], Y, [-1, 0, 0], Z),
    [
      [STAB_CHORD + 0.8, 0],
      [STAB_CHORD + 5, 0],
      [STAB_CHORD + 1.2, 5],
    ],
    9,
    9.8,
    P,
  ),
};

const FIN_FRAME = G.frameOf([FIN_LE, 0, TOP_Z + 2.6], Y, [-1, 0, 0], Z);
export const FIN_ART = {
  fin: G.prismOf(
    FIN_FRAME,
    [
      [0, 0],
      [40, 0],
      [40, 50],
      [31, 52],
    ],
    -1,
    1,
    P,
  ),
  rudder: G.prismOf(
    FIN_FRAME,
    [
      [40.6, 2],
      [53, 4],
      [51, 50],
      [40.6, 50],
    ],
    -0.8,
    0.8,
    P,
  ),
  // The rudder horn is a plate standing out sideways from the rudder, so it is thin in z.
  horn: G.prismOf(
    G.frameOf([FIN_LE, 0, TOP_Z + 12], Z, [-1, 0, 0], Y),
    [
      [41, 0.8],
      [45, 0.8],
      [41.4, 5.5],
    ],
    -0.4,
    0.4,
    P,
  ),
  root: G.prismOf(
    FIN_FRAME,
    [
      [-4, 0],
      [42, 0],
      [42, 2],
      [2, 2],
    ],
    -1.8,
    1.8,
    P,
  ),
};

/* --------------------------------------------------------------------- nose */

const NOSE_AXIS = G.frameOf([NOSE_X, 0, 18], X, Y, Z);
const MOUNT_SQUARE: Array<[number, number]> = [
  [-9, -9],
  [9, -9],
  [9, 9],
  [-9, 9],
];

export const MOTOR_ART = {
  mount: G.prismOf(NOSE_AXIS, MOUNT_SQUARE, 0, 2.5, P),
  mountScrews: dots(
    [
      [-6, -6],
      [6, -6],
      [6, 6],
      [-6, 6],
    ].map(([y, z]) => [NOSE_X + 2.5, y!, 18 + z!] as Point3),
  ),
  stator: G.disc(2.5, 5.5, 6.5, NOSE_AXIS, P),
  can: G.solidOf(
    [
      [5.5, 9],
      [6.2, 9.6, 1],
      [15.4, 9.6, 1],
      [16.4, 8.6],
    ],
    NOSE_AXIS,
    P,
  ),
  canSeam: G.arcOf(NOSE_AXIS, 10.5, 9.6, P),
  shaft: G.disc(16.4, 18.5, 1.6, NOSE_AXIS, P),
};

/** One blade: a tapered paddle in the plane of the disc, turned to `angle` about the shaft. */
function blade(angle: number) {
  const c = Math.cos(angle * RAD);
  const s = Math.sin(angle * RAD);
  const F = G.frameOf([NOSE_X + 25, 0, 18], X, [0, c, s], [0, -s, c]);
  return G.prismOf(
    F,
    [
      [3, -2.4],
      [12, -3.6],
      [24, -3.2],
      [PROP_R - 1, -1.8],
      [PROP_R, 0],
      [PROP_R - 1.4, 1.6],
      [24, 2.6],
      [12, 2.8],
      [3, 2.2],
    ],
    -0.7,
    0.7,
    P,
  );
}

export const PROP_ART = {
  adapter: G.disc(18.5, 22, 3, NOSE_AXIS, P),
  backplate: G.disc(22, 23.5, SPINNER_R, NOSE_AXIS, P),
  blades: [blade(62), blade(242)],
  spinner: G.solidOf(
    [
      [23.5, SPINNER_R],
      [26.5, 8.2, 1],
      [30, 6.8, 1],
      [33, 4.4, 1],
      [35, 1.8, 1],
      [35.4, 0.6, 1],
    ],
    NOSE_AXIS,
    P,
  ),
};

/* --------------------------------------------------------------------- gear */

const MAIN_X = 40;
const MAIN_Z = -30;
const MAIN_R = 11;
const NOSE_GEAR_X = 106;

const rod = (from: Vec, to: Vec, r: number) => {
  const d: Vec = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  return G.solidOf(
    [
      [0, r],
      [length, r],
    ],
    G.frameAlong(from, d),
    P,
  );
};

const wheel = (x: number, y: number, z: number, r: number, width: number) => {
  const F = G.frameAlong([x, y - width / 2, z], Y);
  return {
    tyre: G.solidOf(
      [
        [0, r - 1.6],
        [0.8, r - 0.2, 1],
        [width / 2, r, 1],
        [width - 0.8, r - 0.2, 1],
        [width, r - 1.6],
      ],
      F,
      P,
    ),
    hub: G.disc(width, width + 1.2, r * 0.38, F, P),
    collar: G.disc(width + 1.2, width + 2.6, 1.6, F, P),
    hubRing: G.circleOf(F, width, r * 0.62, P, 32),
  };
};

const mainLeg = (side: 1 | -1) => ({
  leg: rod([MAIN_X, side * 5, 0.5], [MAIN_X, side * 36, MAIN_Z], 0.9),
  axle: rod([MAIN_X, side * 36, MAIN_Z], [MAIN_X, side * 40, MAIN_Z], 0.9),
  wheel: wheel(MAIN_X, side * 43, MAIN_Z, MAIN_R, 5),
});

export const GEAR_FAR = mainLeg(-1);
export const GEAR_NEAR = mainLeg(1);
export const NOSE_GEAR = {
  block: slabOf({ x: NOSE_GEAR_X - 3, y: -3, w: 6, d: 6, r: 1 }, -3, 3, P, 2, 0.3),
  leg: rod([NOSE_GEAR_X, 0, -3], [NOSE_GEAR_X, 0, -18], 1.1),
  coil: G.disc(6, 9, 2.2, G.frameAlong([NOSE_GEAR_X, 0, -3], [0, 0, -1]), P),
  fork: rod([NOSE_GEAR_X, -3.2, -18], [NOSE_GEAR_X, 3.2, -18], 1),
  wheel: wheel(NOSE_GEAR_X, 0, -27, 8, 4),
};

/** Every solid the figure draws, counted from the geometry itself. */
function countSolids(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if ("outline" in value && "shades" in value) return 1;
  return Object.values(value).reduce<number>((sum, item) => sum + countSolids(item), 0);
}

export const PART_COUNT = countSolids([
  STAND_ART,
  FUSELAGE_BACK,
  FUSELAGE_FRONT,
  HATCH_ART,
  BATTERY_ART,
  RADIO_ART,
  WING_FAR,
  WING_NEAR,
  STAB_FAR,
  STAB_NEAR,
  FIN_ART,
  MOTOR_ART,
  PROP_ART,
  GEAR_FAR,
  GEAR_NEAR,
  NOSE_GEAR,
]);
