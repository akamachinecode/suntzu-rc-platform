/**
 * Air: a high-wing trainer flying circuits over a club field, with a loop over the runway.
 * Its attitude comes from the path itself: lift points along the acceleration it needs
 * plus gravity, so it banks into the turns and is upside down at the top of the loop.
 */
import { ExtrudeGeometry, Group, Matrix4, Shape, Vector2, Vector3 } from "three";
import { LoftGeometry } from "three/addons/geometries/LoftGeometry.js";
import { cloud, displayBase, palm, windsock } from "./props";
import {
  castShadow,
  clamp01,
  follow,
  live,
  place,
  rod,
  wave,
  type Build,
  type Kit,
  type Swatch,
} from "./toy";

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/* --------------------------------------------------------------- the plane */

/** A fuselage cross-section at station x: a rounded rectangle (a superellipse). */
function section(x: number, bottom: number, top: number, half: number, n = 28) {
  const middle = (top + bottom) / 2;
  const height = (top - bottom) / 2;
  const points: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const c = Math.cos(t);
    const s = Math.sin(t);
    points.push(
      new Vector3(
        x,
        middle + height * Math.sign(s) * Math.sqrt(Math.abs(s)),
        -half * Math.sign(c) * Math.sqrt(Math.abs(c)),
      ),
    );
  }
  return points;
}

/** The box fuselage of a foam trainer: full depth under the wing, tapering to the tail. */
function fuselageAt(x: number) {
  const aft = clamp01((0.05 - x) / 1.9);
  return {
    half: 0.22 - 0.16 * aft,
    top: 0.3 - 0.13 * aft,
    bottom: -0.27 + 0.33 * clamp01((0.25 - x) / 2.1),
  };
}

const STATIONS = [-1.85, -1.6, -1.3, -1, -0.7, -0.4, -0.1, 0.2, 0.5, 0.8, 1.05, 1.18];
const TOP = fuselageAt(0.2).top;
/** Main wheels touch the ground this far below the fuselage datum; the tail wheel less. */
const MAIN_WHEEL = { x: 0.7, y: -0.74 };
const TAIL_WHEEL = { x: -1.78, y: -0.1 };

function extrudeXY(points: Array<[number, number]>, depth: number) {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

interface Scheme {
  body: Swatch;
  cowl: Swatch;
  wing: Swatch;
  tips: Swatch;
  tail: Swatch;
  rudder: Swatch;
}

function trainer(kit: Kit, scheme: Scheme) {
  const plane = new Group();

  // fuselage, cowl, windows
  const body = new LoftGeometry(
    STATIONS.map((x) => {
      const f = fuselageAt(x);
      return section(x, f.bottom, f.top, f.half);
    }),
    { capStart: true, capEnd: true },
  );
  body.computeVertexNormals();
  plane.add(kit.part(body, scheme.body));
  const cowl = new LoftGeometry(
    [1.16, 1.3, 1.42].map((x, i) =>
      section(x, -0.25 + i * 0.035, 0.27 - i * 0.04, 0.205 - i * 0.025),
    ),
    { capStart: true, capEnd: true },
  );
  cowl.computeVertexNormals();
  plane.add(kit.part(cowl, scheme.cowl));
  for (const side of [-1, 1]) {
    plane.add(place(kit.part(kit.box(0.26, 0.15, 0.03, 0.03), "sky"), 0.47, 0.13, side * 0.218));
    plane.add(place(kit.part(kit.box(0.3, 0.15, 0.03, 0.03), "sky"), 0.12, 0.13, side * 0.218));
  }
  plane.add(place(kit.part(kit.box(0.08, 0.17, 0.36, 0.03), "sky"), 0.68, 0.2, 0, [0, 0, 0.6]));

  // wing: two panels with dihedral, flaps and ailerons, coloured tips, a roundel on each
  for (const side of [-1, 1]) {
    const panel = new Group();
    panel.position.set(0.22, TOP + 0.045, 0);
    panel.rotation.x = -side * 4 * RAD;
    panel.add(place(kit.part(kit.box(0.62, 0.09, 1.98, 0.04), scheme.wing), 0.09, 0, side * 1.03));
    panel.add(place(kit.part(kit.box(0.17, 0.06, 0.88, 0.02), scheme.wing), -0.32, 0, side * 0.5));
    panel.add(place(kit.part(kit.box(0.17, 0.06, 0.98, 0.02), scheme.wing), -0.32, 0, side * 1.47));
    panel.add(place(kit.part(kit.box(0.8, 0.1, 0.12, 0.04), scheme.tips), 0, 0, side * 2.07));
    const roundel = [
      [0.3, "panel"],
      [0.25, "sky"],
      [0.16, "panel"],
      [0.08, "lead"],
    ] as const;
    roundel.forEach(([r, swatch], i) => {
      const disc = kit.part(kit.cylinder(r, r, 0.01, 32), swatch, { ink: false });
      panel.add(place(disc, 0.06, 0.05 + i * 0.004, side * 1.3));
    });
    plane.add(panel);
    plane.add(rod(kit, [0.26, -0.14, side * 0.21], [0.24, TOP + 0.02, side * 1.15], 0.022, "ink"));
  }

  // tail: stab, elevator, fin, rudder
  plane.add(place(kit.part(kit.box(0.46, 0.05, 1.5, 0.02), scheme.tail), -1.6, 0.19, 0));
  plane.add(place(kit.part(kit.box(0.16, 0.04, 1.36, 0.02), scheme.tail), -1.93, 0.19, 0));
  const fin: Array<[number, number]> = [
    [-1.84, 0.18],
    [-1.4, 0.18],
    [-1.72, 0.76],
    [-1.92, 0.76],
  ];
  const rudder: Array<[number, number]> = [
    [-1.95, 0.18],
    [-2.1, 0.18],
    [-2.1, 0.72],
    [-1.95, 0.76],
  ];
  plane.add(kit.part(extrudeXY(fin, 0.05), scheme.tail));
  plane.add(kit.part(extrudeXY(rudder, 0.05), scheme.rudder));

  // undercarriage
  for (const side of [-1, 1]) {
    plane.add(rod(kit, [0.62, -0.24, side * 0.1], [MAIN_WHEEL.x, -0.6, side * 0.4], 0.02, "ink"));
    const tyre = kit.part(kit.cylinder(0.14, 0.14, 0.08, 20), "ink");
    tyre.add(kit.part(kit.cylinder(0.06, 0.06, 0.1, 16), "panel"));
    plane.add(place(tyre, MAIN_WHEEL.x, -0.6, side * 0.44, [Math.PI / 2, 0, 0]));
  }
  plane.add(rod(kit, [-1.7, 0.08, 0], [TAIL_WHEEL.x, -0.05, 0], 0.015, "ink"));
  const tailWheel = kit.part(kit.cylinder(0.05, 0.05, 0.04, 12), "ink");
  plane.add(place(tailWheel, TAIL_WHEEL.x, -0.05, 0, [Math.PI / 2, 0, 0]));

  // spinner and prop; the see-through disc is what a spinning prop looks like
  const prop = new Group();
  prop.name = "prop";
  prop.position.set(1.45, 0.01, 0);
  prop.add(
    place(kit.part(kit.cylinder(0, 0.12, 0.24, 20), "panel"), 0.1, 0, 0, [0, 0, -Math.PI / 2]),
  );
  for (const side of [-1, 1]) {
    const blade = kit.part(kit.box(0.035, 0.6, 0.1, 0.015), "ink");
    prop.add(place(blade, 0.02, side * 0.32, 0, [side * 0.3, 0, 0]));
  }
  plane.add(prop);
  const disc = kit.part(kit.cylinder(0.63, 0.63, 0.004, 40), "panel", { opacity: 0.35 });
  disc.name = "disc";
  plane.add(place(disc, 1.47, 0.01, 0, [0, 0, Math.PI / 2]));

  return { plane, prop, disc };
}

/* ------------------------------------------------------------- the circuit */

const Y0 = 2.9; // circuit height
const LEG = 2; // half the length of each straight
const TURN = 1.9; // turn radius
const LOOP = 1.35; // loop radius
const SPEED = 2.3; // units per second
const G = 3.3; // gravity, tuned for a ~40° bank in the turns

type Point = [number, number, number];
const SEGMENTS: Array<{ length: number; at: (u: number) => Point }> = [
  { length: 2 * LEG, at: (u) => [-LEG + 2 * LEG * u, Y0, -TURN] },
  {
    length: Math.PI * TURN,
    at: (u) => [LEG + TURN * Math.sin(u * Math.PI), Y0, -TURN * Math.cos(u * Math.PI)],
  },
  { length: LEG, at: (u) => [LEG - LEG * u, Y0, TURN] },
  {
    length: TAU * LOOP,
    at: (u) => [-LOOP * Math.sin(u * TAU), Y0 + LOOP - LOOP * Math.cos(u * TAU), TURN],
  },
  { length: LEG, at: (u) => [-LEG * u, Y0, TURN] },
  {
    length: Math.PI * TURN,
    at: (u) => [-LEG - TURN * Math.sin(u * Math.PI), Y0, TURN * Math.cos(u * Math.PI)],
  },
];
const LENGTH = SEGMENTS.reduce((sum, segment) => sum + segment.length, 0);

function pathAt(s: number, out = new Vector3()) {
  let left = ((s % LENGTH) + LENGTH) % LENGTH;
  for (const segment of SEGMENTS) {
    if (left <= segment.length) return out.set(...segment.at(left / segment.length));
    left -= segment.length;
  }
  return out.set(...SEGMENTS[0]!.at(0));
}

const ahead = new Vector3();
const behind = new Vector3();
const forward = new Vector3();
const lift = new Vector3();
const side = new Vector3();
const basis = new Matrix4();

/** Puts the plane on the circuit at distance `s`, pointing along it, banked by its lift. */
function fly(plane: Group, s: number) {
  pathAt(s, plane.position);
  forward.subVectors(pathAt(s + 0.02, ahead), pathAt(s - 0.02, behind)).normalize();
  // The acceleration over a short window, so the bank rolls in rather than snapping.
  const span = 0.6;
  pathAt(s + span, ahead);
  pathAt(s - span, behind);
  lift
    .copy(ahead)
    .add(behind)
    .addScaledVector(plane.position, -2)
    .multiplyScalar((SPEED * SPEED) / (span * span));
  lift.y += G;
  lift.addScaledVector(forward, -lift.dot(forward)).normalize();
  side.crossVectors(forward, lift);
  basis.makeBasis(forward, lift, side);
  plane.quaternion.setFromRotationMatrix(basis);
}

/* ---------------------------------------------------------------- the field */

function tent(kit: Kit) {
  const canopy = new Group();
  for (const [x, z] of [
    [-0.6, -0.6],
    [0.6, -0.6],
    [0.6, 0.6],
    [-0.6, 0.6],
  ] as const) {
    canopy.add(rod(kit, [x, 0, z], [x, 0.98, z], 0.025, "panel"));
  }
  canopy.add(place(kit.part(kit.box(1.34, 0.13, 1.34, 0.02), "lead"), 0, 1, 0));
  canopy.add(
    place(kit.part(kit.cylinder(0, 0.95, 0.36, 4), "lead"), 0, 1.24, 0, [0, Math.PI / 4, 0]),
  );
  // a folding table with a flight box and a transmitter on it
  canopy.add(place(kit.part(kit.box(0.8, 0.05, 0.42, 0.02), "panel"), 0, 0.5, -0.15));
  for (const x of [-0.34, 0.34])
    canopy.add(rod(kit, [x, 0, -0.15], [x, 0.48, -0.15], 0.02, "steel"));
  canopy.add(place(kit.part(kit.box(0.34, 0.17, 0.22, 0.03), "primary"), -0.14, 0.61, -0.15));
  canopy.add(place(kit.part(kit.box(0.18, 0.06, 0.13, 0.02), "ink"), 0.22, 0.56, -0.15));
  return canopy;
}

/* ----------------------------------------------------------------- diorama */

const FIELD = 10.2;
const RUNWAY_Z = 1.65;
const FENCE_Z = 2.95;

export const build: Build = (kit) => {
  const root = new Group();

  // display base, grass and its mowing stripes
  root.add(displayBase(kit, FIELD, "mat"));
  const bands = 8;
  const band = 9.9 / bands;
  for (let i = 0; i < bands; i += 2) {
    const stripe = kit.part(kit.box(band, 0.006, 9.9, 0.002), "mat", { ink: false, tone: "base" });
    root.add(place(stripe, -4.95 + band * (i + 0.5), 0.003, 0));
  }

  // runway with its centre line and threshold bars
  const strip = new Group();
  strip.position.set(-0.2, 0, RUNWAY_Z);
  strip.add(place(kit.part(kit.box(8.4, 0.05, 1.3, 0.02), "steel"), 0, 0.02, 0));
  for (let x = -3.3; x <= 3.31; x += 0.9) {
    strip.add(
      place(kit.part(kit.box(0.42, 0.01, 0.07, 0.004), "panel", { ink: false }), x, 0.05, 0),
    );
  }
  for (const end of [-1, 1]) {
    for (const z of [-0.45, -0.15, 0.15, 0.45]) {
      const bar = kit.part(kit.box(0.5, 0.01, 0.1, 0.004), "panel", { ink: false });
      strip.add(place(bar, end * 3.85, 0.05, z));
    }
  }
  root.add(strip);

  // the safety fence between the runway and the pits
  for (let x = -4.4; x <= 3.95; x += 0.6) {
    root.add(rod(kit, [x, 0, FENCE_Z], [x, 0.42, FENCE_Z], 0.025, "panel"));
  }
  for (const y of [0.2, 0.38]) {
    root.add(place(kit.part(kit.box(8.5, 0.05, 0.04, 0.015), "panel"), -0.2, y, FENCE_Z));
  }

  // the pits: a tent, a parked trainer, a cooler
  root.add(place(tent(kit), 2.4, 0, 4, [0, -0.15, 0]));
  const { plane: parked, disc: still } = trainer(kit, {
    body: "panel",
    cowl: "primary",
    wing: "sky",
    tips: "panel",
    tail: "sky",
    rudder: "lead",
  });
  still.visible = false;
  const sitting = new Group();
  parked.position.set(-MAIN_WHEEL.x, -MAIN_WHEEL.y, 0);
  sitting.rotation.z = Math.atan2(TAIL_WHEEL.y - MAIN_WHEEL.y, MAIN_WHEEL.x - TAIL_WHEEL.x);
  sitting.add(parked);
  const pitPlane = new Group();
  pitPlane.add(sitting);
  pitPlane.scale.setScalar(0.62);
  root.add(place(pitPlane, -1.4, 0, 4.1, [0, 0.5, 0]));
  root.add(place(kit.part(kit.box(0.5, 0.32, 0.34, 0.05), "sky"), 0.5, 0.16, 4.3, [0, 0.3, 0]));
  root.add(place(kit.part(kit.box(0.54, 0.06, 0.38, 0.03), "panel"), 0.5, 0.35, 4.3, [0, 0.3, 0]));

  const sock = windsock(kit);
  root.add(place(sock.mast, 4.3, 0, -1.6));
  const palms = [
    { ...palm(kit, 2.6, 0.5), at: [-3.9, -3.9], turn: 0.6 },
    { ...palm(kit, 2.2, 0.45), at: [-4.3, 3.9], turn: 2.4 },
    { ...palm(kit, 2.4, 0.4), at: [3.9, -4.1], turn: 4.1 },
  ];
  for (const p of palms) root.add(place(p.tree, p.at[0]!, 0, p.at[1]!, [0, p.turn, 0]));
  for (const [x, z, r] of [
    [-2.6, -4.4, 0.34],
    [-2.1, -4.5, 0.26],
    [4.4, 0.4, 0.3],
    [4.5, -0.1, 0.22],
    [4.3, 4.5, 0.28],
  ] as const) {
    root.add(place(kit.part(kit.sphere(r, 14), "grass"), x, r * 0.55, z));
  }

  const clouds = [
    { puff: cloud(kit, 1), x: -3, y: 6.1, z: -3, drift: 0.8, period: 23 },
    { puff: cloud(kit, 0.75), x: 3.4, y: 5.3, z: -2.4, drift: 0.6, period: 17 },
  ];
  for (const c of clouds) root.add(c.puff);

  const { plane, prop, disc } = trainer(kit, {
    body: "panel",
    cowl: "lead",
    wing: "primary",
    tips: "lead",
    tail: "primary",
    rudder: "lead",
  });
  plane.scale.setScalar(0.8);
  kit.bake(live(prop));
  kit.bake(plane);
  root.add(live(plane));
  const shadow = castShadow(kit, plane, 0.07, [prop, disc]);
  root.add(live(shadow.flat));

  // everything that stays put becomes a few meshes
  kit.bake(live(sock.sock));
  for (const p of palms) kit.bake(live(p.crown));
  for (const c of clouds) kit.bake(live(c.puff));
  kit.bake(root);

  return {
    root,
    view: { target: [0, 1.9, 0], height: 13.2, width: 15.8, azimuth: 40, elevation: 28 },
    still: 3,
    tick(t) {
      fly(plane, t * SPEED);
      prop.rotation.x = t * 31;
      follow(shadow.ghost, plane);

      sock.sock.rotation.y = 0.22 * wave(t, 3.3);
      sock.sock.rotation.z = -0.12 - 0.07 * wave(t, 1.9);
      for (const [i, p] of palms.entries()) {
        p.crown.rotation.z = 0.05 * wave(t, 4.2, i * 0.4);
        p.crown.rotation.x = 0.04 * wave(t, 5.1, i * 0.3);
      }
      for (const c of clouds) c.puff.position.set(c.x + c.drift * wave(t, c.period), c.y, c.z);
    },
  };
};
