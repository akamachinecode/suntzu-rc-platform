/**
 * Ground: a short-course truck lapping a sand oval and flying its jump, while a rock crawler
 * picks its way over the rocks in the infield. Both are pure functions of time: every wheel
 * sits on the surface the drawing shows, and the dust is where the truck was.
 */
import {
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Path,
  Shape,
  Vector2,
  Vector3,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { displayBase, palm } from "./props";
import { clamp01, ease, live, place, rod, wave, type Build, type Kit, type Swatch } from "./toy";

const TAU = Math.PI * 2;

function extrudeXY(points: Array<[number, number]>, depth: number) {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/* ------------------------------------------------------------------ the track */

const ZC = -0.25; // the oval's centre
const LX = 1.6; // half the length of each straight
const R = 2.4; // turn radius, on the racing line
const W = 1.5; // track width

/** A stadium (two straights, two semicircles) as a closed path. */
function stadium(path: Path, half: number, radius: number, clockwise = false) {
  path.moveTo(-half, -radius);
  path.lineTo(half, -radius);
  path.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, clockwise);
  path.lineTo(-half, radius);
  path.absarc(-half, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, clockwise);
  return path;
}

type Point = [number, number];
/** The racing line, anticlockwise from above: back straight (+x), right turn, front, left. */
const SEGMENTS: Array<{ length: number; at: (u: number) => Point }> = [
  { length: 2 * LX, at: (u) => [-LX + 2 * LX * u, ZC - R] },
  {
    length: Math.PI * R,
    at: (u) => [LX + R * Math.sin(u * Math.PI), ZC - R * Math.cos(u * Math.PI)],
  },
  { length: 2 * LX, at: (u) => [LX - 2 * LX * u, ZC + R] },
  {
    length: Math.PI * R,
    at: (u) => [-LX - R * Math.sin(u * Math.PI), ZC + R * Math.cos(u * Math.PI)],
  },
];
const LAP = SEGMENTS.reduce((sum, segment) => sum + segment.length, 0);

function lineAt(s: number): Point {
  let left = ((s % LAP) + LAP) % LAP;
  for (const segment of SEGMENTS) {
    if (left <= segment.length) return segment.at(left / segment.length);
    left -= segment.length;
  }
  return SEGMENTS[0]!.at(0);
}
/** Whether distance `s` is on the back straight, where the jump is. */
const onBack = (s: number) => ((s % LAP) + LAP) % LAP < 2 * LX;

// The jump on the back straight: a kicker, a gap, a landing ramp. The truck leaves the
// kicker's lip and follows a parabola that lands it on the ramp's face.
const KICK = [-1.2, -0.6] as const;
const LAND = [0.8, 1.4] as const;
const LIP = 0.45;
const SLOPE = LIP / (KICK[1] - KICK[0]);
const TOUCH = 1.05;
const ARC =
  (LIP + SLOPE * (TOUCH - KICK[1]) - LIP * ((LAND[1] - TOUCH) / (LAND[1] - LAND[0]))) /
  (TOUCH - KICK[1]) ** 2;

function rampAt(x: number) {
  if (x > KICK[0] && x < KICK[1]) return LIP * ((x - KICK[0]) / (KICK[1] - KICK[0]));
  if (x > LAND[0] && x < LAND[1]) return LIP * ((LAND[1] - x) / (LAND[1] - LAND[0]));
  return 0;
}
/** The height of the truck's wheels at distance `s`: the ground, a ramp or the flight arc. */
function groundAt(s: number) {
  if (!onBack(s)) return 0;
  const [x] = lineAt(s);
  if (x >= KICK[1] && x <= TOUCH) {
    const d = x - KICK[1];
    return LIP + SLOPE * d - ARC * d * d;
  }
  return rampAt(x);
}

/* ---------------------------------------------------------------- the rocks */

const bell = (x: number, c: number, w: number) => {
  const u = (x - c) / w;
  return Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0;
};
/** The rock garden's profile under the crawler's wheels. */
const rockAt = (x: number) =>
  0.42 * bell(x, 0, 0.78) + 0.24 * bell(x, -0.98, 0.42) + 0.28 * bell(x, 0.95, 0.44);
const ROCK = 1.7;

/* --------------------------------------------------------------- the trucks */

const TRUCK = { r: 0.15, base: 0.66, track: 0.33 };
const CRAWLER = { r: 0.2, base: 0.72, track: 0.3 };
/** Both are modelled at one size and shown larger; the kinematics use the shown size. */
const GROW = 1.3;

function wheel(kit: Kit, r: number, width: number, rim: Swatch) {
  const spin = new Group();
  const tyre = kit.part(kit.cylinder(r, r, width, 22), "ink");
  tyre.rotation.x = Math.PI / 2;
  spin.add(tyre);
  for (let i = 0; i < 10; i++) {
    const lug = kit.part(kit.box(0.05, 0.035, width * 0.9, 0.01), "ink");
    const a = (i / 10) * TAU;
    spin.add(place(lug, Math.cos(a) * r, Math.sin(a) * r, 0, [0, 0, a]));
  }
  const hub = kit.part(kit.cylinder(r * 0.55, r * 0.55, width + 0.012, 18), rim);
  hub.rotation.x = Math.PI / 2;
  spin.add(hub);
  return spin;
}

/** A 1/10 short-course truck: pickup shell over outboard wheels. */
function shortCourse(kit: Kit) {
  const truck = new Group();
  const body = new Group();
  truck.add(body);
  const profile: Point[] = [
    [-0.56, 0.16],
    [0.56, 0.16],
    [0.6, 0.3],
    [0.32, 0.36],
    [0.14, 0.55],
    [-0.16, 0.55],
    [-0.24, 0.38],
    [-0.56, 0.38],
  ];
  // sky blue, so it stands out against the red of its section
  body.add(kit.part(extrudeXY(profile, 0.5), "sky"));
  for (const side of [-1, 1]) {
    body.add(place(kit.part(kit.box(0.24, 0.12, 0.02, 0.02), "ink"), -0.03, 0.46, side * 0.25));
    body.add(
      place(
        kit.part(kit.cylinder(0.09, 0.09, 0.01, 20), "panel", { ink: false }),
        0.04,
        0.26,
        side * 0.253,
        [Math.PI / 2, 0, 0],
      ),
    );
  }
  body.add(place(kit.part(kit.box(0.2, 0.02, 0.4, 0.01), "ink"), 0.23, 0.46, 0, [0, 0, 0.83]));
  body.add(place(kit.part(kit.box(0.16, 0.06, 0.4, 0.02), "primary"), 0, 0.58, 0));
  body.add(place(kit.part(kit.box(0.06, 0.08, 0.56, 0.02), "ink"), 0.62, 0.2, 0));
  body.add(place(kit.part(kit.box(0.06, 0.08, 0.56, 0.02), "ink"), -0.6, 0.2, 0));
  const wheels = [-1, 1].flatMap((end) =>
    [-1, 1].map((side) => {
      const steer = new Group();
      steer.position.set((end * TRUCK.base) / 2, 0, side * TRUCK.track);
      const w = wheel(kit, TRUCK.r, 0.13, "panel");
      steer.add(w);
      truck.add(steer);
      return { end, steer, spin: w };
    }),
  );
  return { truck, body, wheels };
}

/** A scale rock crawler: Jeep-like body, roll cage, big lugged tyres on solid axles. */
function crawler(kit: Kit) {
  const rig = new Group();
  const body = new Group();
  rig.add(body);
  body.add(place(kit.part(kit.box(0.84, 0.2, 0.46, 0.05), "panel"), 0, 0.4, 0));
  body.add(place(kit.part(kit.box(0.3, 0.1, 0.44, 0.04), "panel"), 0.3, 0.54, 0));
  body.add(place(kit.part(kit.box(0.04, 0.16, 0.46, 0.02), "ink"), 0.44, 0.44, 0));
  for (const z of [-0.12, 0, 0.12]) {
    body.add(
      place(kit.part(kit.box(0.01, 0.1, 0.05, 0.005), "panel", { ink: false }), 0.465, 0.45, z),
    );
  }
  for (const side of [-1, 1]) {
    body.add(
      place(kit.part(kit.cylinder(0.04, 0.04, 0.02, 14), "primary"), 0.465, 0.46, side * 0.17, [
        0,
        0,
        Math.PI / 2,
      ]),
    );
    for (const end of [-1, 1]) {
      const fender = kit.part(kit.box(0.34, 0.03, 0.12, 0.01), "ink");
      body.add(place(fender, (end * CRAWLER.base) / 2, 0.5, side * 0.27));
    }
  }
  // the cage
  const cage: Array<[[number, number, number], [number, number, number]]> = [];
  for (const side of [-1, 1]) {
    cage.push([
      [0.12, 0.6, side * 0.2],
      [0.02, 0.86, side * 0.18],
    ]);
    cage.push([
      [0.02, 0.86, side * 0.18],
      [-0.32, 0.86, side * 0.18],
    ]);
    cage.push([
      [-0.32, 0.86, side * 0.18],
      [-0.38, 0.5, side * 0.2],
    ]);
  }
  cage.push([
    [0.02, 0.86, -0.18],
    [0.02, 0.86, 0.18],
  ]);
  cage.push([
    [-0.32, 0.86, -0.18],
    [-0.32, 0.86, 0.18],
  ]);
  for (const [a, b] of cage) body.add(rod(kit, a, b, 0.018, "ink"));
  body.add(place(kit.part(kit.box(0.08, 0.05, 0.3, 0.015), "primary"), 0.02, 0.9, 0));
  const spare = kit.part(kit.cylinder(0.15, 0.15, 0.09, 20), "ink");
  body.add(place(spare, -0.46, 0.5, 0, [0, 0, Math.PI / 2]));
  body.add(
    place(kit.part(kit.cylinder(0.08, 0.08, 0.1, 16), "primary"), -0.47, 0.5, 0, [
      0,
      0,
      Math.PI / 2,
    ]),
  );

  const axles = [-1, 1].map((end) => {
    const axle = new Group();
    axle.add(rod(kit, [0, 0, -CRAWLER.track], [0, 0, CRAWLER.track], 0.03, "steel"));
    axle.add(kit.part(kit.sphere(0.07, 14), "steel"));
    const spins = [-1, 1].map((side) => {
      const w = wheel(kit, CRAWLER.r, 0.16, "primary");
      axle.add(place(w, 0, 0, side * CRAWLER.track));
      return w;
    });
    rig.add(axle);
    return { end, axle, spins };
  });
  return { rig, body, axles };
}

/* ------------------------------------------------------------------ the field */

function tyreStack(kit: Kit) {
  const stack = new Group();
  for (let i = 0; i < 3; i++) {
    stack.add(place(kit.part(kit.cylinder(0.17, 0.17, 0.1, 18), "ink"), 0, 0.05 + i * 0.105, 0));
  }
  stack.add(
    place(kit.part(kit.cylinder(0.08, 0.08, 0.01, 14), "steel", { ink: false }), 0, 0.316, 0),
  );
  return stack;
}

function flag(kit: Kit, swatch: Swatch) {
  const pole = new Group();
  pole.add(rod(kit, [0, 0, 0], [0, 1.25, 0], 0.025, "panel"));
  const cloth = new Group();
  cloth.position.set(0, 1.12, 0);
  cloth.add(place(kit.part(kit.box(0.42, 0.24, 0.015, 0.01), swatch), 0.22, 0, 0));
  pole.add(cloth);
  return { pole, cloth };
}

/** Bleachers behind the back straight. */
function grandstand(kit: Kit) {
  const stand = new Group();
  const colours: Swatch[] = ["panel", "sky", "panel"];
  colours.forEach((swatch, i) => {
    stand.add(place(kit.part(kit.box(3, 0.16, 0.36, 0.03), swatch), 0, 0.12 + i * 0.22, -i * 0.36));
    stand.add(
      place(
        kit.part(kit.box(3, 0.12 + i * 0.22, 0.34, 0.02), "steel"),
        0,
        (0.12 + i * 0.22) / 2 - 0.02,
        -i * 0.36,
      ),
    );
  });
  for (const x of [-1.5, 1.5]) {
    stand.add(rod(kit, [x, 0.6, -0.72], [x, 1.05, -0.72], 0.02, "steel"));
  }
  stand.add(place(kit.part(kit.box(3.1, 0.06, 0.05, 0.02), "lead"), 0, 1.05, -0.72));
  return stand;
}

/* ----------------------------------------------------------------- diorama */

const FIELD = 10.2;
const SPEED = 3.2;
const CRAWL = 17; // seconds for the crawler to go over the rocks and back

/** Where the crawler is along its line over the rocks, at time t. */
function crawlAt(t: number) {
  const c = ((t % CRAWL) + CRAWL) % CRAWL;
  const half = CRAWL / 2;
  const go = c < half ? ease((c - 0.6) / (half - 1.2)) : 1 - ease((c - half - 0.6) / (half - 1.2));
  return -1.25 + 2.5 * go;
}

export const build: Build = (kit) => {
  const root = new Group();
  root.add(displayBase(kit, FIELD, "mat"));

  // the sand oval, its kerbs, start line and finish gantry
  const outer = stadium(new Shape(), LX, R + W / 2) as Shape;
  outer.holes.push(stadium(new Path(), LX, R - W / 2, true));
  const sand = new ExtrudeGeometry(outer, { depth: 0.05, bevelEnabled: false, curveSegments: 40 });
  sand.rotateX(-Math.PI / 2);
  root.add(place(kit.part(sand, "primary"), 0, 0, ZC));
  for (const end of [-1, 1]) {
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      const r = R - W / 2 - 0.06;
      const kerb = kit.part(kit.box(0.3, 0.06, 0.12, 0.015), i % 2 ? "panel" : "lead");
      // along the curve: the tangent of the arc at angle a
      const along = Math.atan2(-end * Math.cos(a), -end * Math.sin(a));
      root.add(
        place(kerb, end * (LX + r * Math.cos(a)), 0.04, ZC + end * r * Math.sin(a), [0, along, 0]),
      );
    }
  }
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 10; i++) {
      const square = kit.part(
        kit.box(0.12, 0.008, W / 10, 0.002),
        (i + row) % 2 ? "panel" : "ink",
        { ink: false },
      );
      root.add(place(square, -0.06 + row * 0.12, 0.054, ZC + R - W / 2 + (i + 0.5) * (W / 10)));
    }
  }
  for (const z of [ZC + R - W / 2 - 0.15, ZC + R + W / 2 + 0.15]) {
    root.add(rod(kit, [0, 0, z], [0, 1.35, z], 0.035, "panel"));
  }
  root.add(place(kit.part(kit.box(0.12, 0.3, W + 0.5, 0.03), "lead"), 0, 1.36, ZC + R));
  for (let i = 0; i < 8; i++) {
    const check = kit.part(kit.box(0.01, 0.1, (W + 0.4) / 8, 0.002), i % 2 ? "panel" : "ink", {
      ink: false,
    });
    root.add(place(check, 0.065, 1.36, ZC + R - (W + 0.4) / 2 + (i + 0.5) * ((W + 0.4) / 8)));
  }

  // the jump
  const kicker = kit.part(
    extrudeXY(
      [
        [KICK[0], 0],
        [KICK[1], 0],
        [KICK[1], LIP],
      ],
      W - 0.1,
    ),
    "primary",
  );
  const landing = kit.part(
    extrudeXY(
      [
        [LAND[0], 0],
        [LAND[1], 0],
        [LAND[0], LIP],
      ],
      W - 0.1,
    ),
    "primary",
  );
  root.add(place(kicker, 0, 0.05, ZC - R), place(landing, 0, 0.05, ZC - R));

  // the rock garden in the infield: one slab the crawler drives on, boulders round it
  const slab: Point[] = [
    [ROCK, 0],
    [-ROCK, 0],
  ];
  for (let i = 0; i <= 48; i++) {
    const x = -ROCK + (i / 48) * 2 * ROCK;
    slab.push([x, rockAt(x)]);
  }
  root.add(place(kit.part(extrudeXY(slab, 1.12), "steel"), 0, 0, ZC));
  const boulders: Array<[number, number, number, Swatch]> = [
    [-1.3, 0.74, 0.24, "muted"],
    [-0.55, 0.8, 0.3, "steel"],
    [0.2, 0.78, 0.22, "muted"],
    [0.85, 0.76, 0.28, "steel"],
    [1.5, 0.68, 0.18, "muted"],
    [-1.0, -0.78, 0.26, "muted"],
    [-0.2, -0.8, 0.2, "steel"],
    [0.55, -0.78, 0.3, "muted"],
    [1.35, -0.73, 0.22, "steel"],
    [-1.75, -0.2, 0.16, "steel"],
    [1.85, 0.25, 0.14, "muted"],
  ];
  boulders.forEach(([x, z, r, swatch], i) => {
    const rock = kit.part(new IcosahedronGeometry(r, 0), swatch);
    rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    rock.scale.set(1.15, 0.8, 1);
    root.add(place(rock, x, r * 0.5, ZC + z));
  });

  // trackside
  for (const [x, z] of [
    [4.6, ZC - 2.6],
    [4.6, ZC + 2.7],
    [-4.6, ZC - 2.6],
    [-4.6, ZC + 2.7],
    [2.6, ZC - 3.5],
  ] as const) {
    root.add(place(tyreStack(kit), x, 0, z));
  }
  root.add(place(grandstand(kit), -0.4, 0, -4.2));
  const flags = [flag(kit, "lead"), flag(kit, "sky"), flag(kit, "primary")];
  flags.forEach((f, i) => root.add(place(f.pole, -3.2 + i * 0.7, 0, 3.6 + i * 0.25, [0, 0.4, 0])));
  const palms = [
    { ...palm(kit, 2.3, 0.45), at: [-4.3, -4.2], turn: 0.4 },
    { ...palm(kit, 2.6, 0.5), at: [4.3, -4.3], turn: 3.1 },
    { ...palm(kit, 2.1, 0.4), at: [4.3, 4.2], turn: 5.4 },
  ];
  for (const p of palms) root.add(place(p.tree, p.at[0]!, 0, p.at[1]!, [0, p.turn, 0]));
  // a pit table: tools and spare packs
  root.add(place(kit.part(kit.box(1, 0.05, 0.46, 0.02), "panel"), 1.6, 0.48, 4.1, [0, -0.2, 0]));
  for (const x of [1.18, 2.02]) root.add(rod(kit, [x, 0, 4.1], [x, 0.46, 4.1], 0.02, "steel"));
  root.add(place(kit.part(kit.box(0.36, 0.16, 0.26, 0.03), "lead"), 1.4, 0.58, 4.05));
  root.add(place(kit.part(kit.box(0.24, 0.08, 0.14, 0.02), "sky"), 1.85, 0.55, 4.12));

  // the truck, the crawler and the truck's dust
  const sc = shortCourse(kit);
  sc.truck.scale.setScalar(GROW);
  kit.bake(sc.body);
  for (const w of sc.wheels) kit.bake(w.spin);
  root.add(live(sc.truck));
  const rig = crawler(kit);
  rig.body.scale.setScalar(GROW);
  kit.bake(rig.body);
  for (const axle of rig.axles) {
    axle.axle.scale.setScalar(GROW);
    for (const spin of axle.spins) kit.bake(live(spin));
    kit.bake(axle.axle);
  }
  root.add(live(rig.rig));
  const puffs = Array.from({ length: 16 }, () => {
    const puff = kit.part(kit.sphere(0.5, 12), "panel", { opacity: 0.5 });
    puff.material = (puff.material as ShaderMaterial).clone();
    root.add(puff);
    return puff;
  });
  for (const f of flags) kit.bake(live(f.cloth));
  for (const p of palms) kit.bake(live(p.crown));
  kit.bake(root);
  const PUFF_EVERY = 0.07;
  const PUFF_LIFE = 0.9;

  const a = new Vector3();
  const b = new Vector3();
  /** Puts a vehicle on the racing line at s: heading from the line, height from the ground. */
  const truckAt = (s: number, target: Object3D) => {
    const [x, z] = lineAt(s);
    const [x1, z1] = lineAt(s + 0.05);
    const heading = Math.atan2(-(z1 - z), x1 - x);
    const front = groundAt(s + (TRUCK.base * GROW) / 2);
    const back = groundAt(s - (TRUCK.base * GROW) / 2);
    target.position.set(x, 0.05 + (front + back) / 2, z);
    target.rotation.set(0, heading, Math.atan2(front - back, TRUCK.base * GROW), "YZX");
  };

  return {
    root,
    view: { target: [0, 0.2, 0], height: 10.4, width: 15.8, azimuth: 40, elevation: 30 },
    still: 0.56,
    tick(t) {
      // truck
      const s = t * SPEED;
      truckAt(s, sc.truck);
      const sinceLanding = onBack(s) ? (lineAt(s)[0] - TOUCH) / SPEED : -1;
      const bounce =
        sinceLanding > 0 ? -0.06 * Math.exp(-7 * sinceLanding) * Math.cos(16 * sinceLanding) : 0;
      sc.body.position.y = 0.02 + bounce + 0.006 * wave(t, 0.13);
      // lean out of the turns a little; steer into them
      const [ax, az] = lineAt(s + 0.5);
      const [bx, bz] = lineAt(s - 0.5);
      const [cx, cz] = lineAt(s);
      a.set(ax - cx, 0, az - cz);
      b.set(cx - bx, 0, cz - bz);
      const turning = a.x * b.z - a.z * b.x;
      sc.body.rotation.x = clamp01(Math.abs(turning) * 2) * 0.07 * Math.sign(turning);
      for (const w of sc.wheels) {
        w.spin.rotation.z = -s / (TRUCK.r * GROW);
        w.steer.rotation.y = w.end > 0 ? turning * 5 : 0;
        w.steer.position.y = TRUCK.r;
      }

      // dust, where the rear wheels were, while they're on the sand
      puffs.forEach((puff, i) => {
        const age = (t - i * PUFF_EVERY) % (puffs.length * PUFF_EVERY);
        const born = s - age * SPEED - (TRUCK.base * GROW) / 2;
        const grounded = groundAt(born) < 0.01;
        const life = age / PUFF_LIFE;
        const visible = age >= 0 && life < 1 && grounded;
        puff.visible = visible;
        if (!visible) return;
        const [px, pz] = lineAt(born);
        puff.position.set(px + wave(i, 1.7) * 0.15, 0.08 + life * 0.3, pz + wave(i, 2.3) * 0.15);
        puff.scale.setScalar(0.1 + life * 0.32);
        (puff.material as ShaderMaterial).uniforms.uOpacity!.value = 0.55 * (1 - life) ** 1.5;
      });

      // crawler
      const x = crawlAt(t);
      const base = CRAWLER.base * GROW;
      const hf = rockAt(x + base / 2);
      const hb = rockAt(x - base / 2);
      rig.rig.position.set(x, 0, ZC);
      for (const axle of rig.axles) {
        const h = axle.end > 0 ? hf : hb;
        axle.axle.position.set((axle.end * base) / 2, h + CRAWLER.r * GROW, 0);
        for (const spin of axle.spins) spin.rotation.z = -x / (CRAWLER.r * GROW);
      }
      rig.body.position.y = (hf + hb) / 2 + 0.02;
      rig.body.rotation.z = Math.atan2(hf - hb, base);

      for (const [i, f] of flags.entries())
        f.cloth.rotation.y = 0.35 * wave(t, 1.1 + i * 0.2, i * 0.3);
      for (const [i, p] of palms.entries()) {
        p.crown.rotation.z = 0.05 * wave(t, 4.3, i * 0.4);
        p.crown.rotation.x = 0.04 * wave(t, 5.2, i * 0.3);
      }
    },
  };
};
