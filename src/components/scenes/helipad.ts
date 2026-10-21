/**
 * Rotor: a 450-class helicopter on a club's helipad. It spools up, lifts off, hovers through
 * a slow pirouette, settles back onto the pad and spools down. Its downwash ripples the
 * grass while it's low.
 */
import {
  ExtrudeGeometry,
  Group,
  RingGeometry,
  Shape,
  Vector2,
  Vector3,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { LoftGeometry } from "three/addons/geometries/LoftGeometry.js";
import { displayBase, palm, windsock } from "./props";
import {
  castShadow,
  clamp01,
  ease,
  follow,
  live,
  place,
  rod,
  wave,
  type Build,
  type Kit,
} from "./toy";

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------- the heli */

/** A canopy cross-section: a rounded oval at station x. */
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
        middle + height * Math.sign(s) * Math.abs(s) ** 0.8,
        -half * Math.sign(c) * Math.abs(c) ** 0.8,
      ),
    );
  }
  return points;
}

const CANOPY: Array<[number, number, number, number]> = [
  [-0.42, 0.2, 0.5, 0.2],
  [-0.2, 0.15, 0.6, 0.27],
  [0.1, 0.13, 0.66, 0.3],
  [0.4, 0.13, 0.62, 0.28],
  [0.64, 0.15, 0.52, 0.22],
  [0.82, 0.2, 0.42, 0.13],
  [0.92, 0.27, 0.34, 0.04],
];

function extrudeXY(points: Array<[number, number]>, depth: number) {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

const ROTOR_Y = 1.26;
const BLADE = 1.62;

function helicopter(kit: Kit) {
  const heli = new Group();

  const canopy = new LoftGeometry(
    CANOPY.map(([x, bottom, top, half]) => section(x, bottom, top, half)),
    { capStart: true, capEnd: true },
  );
  canopy.computeVertexNormals();
  heli.add(kit.part(canopy, "lead"));
  // windscreen and side windows, and a white flash down each side
  const glass = kit.part(kit.sphere(0.5, 24), "sky", { ink: false });
  glass.scale.set(0.42, 0.2, 0.36);
  heli.add(place(glass, 0.6, 0.47, 0));
  for (const side of [-1, 1]) {
    const flash = kit.part(kit.sphere(0.5, 20), "panel", { ink: false });
    flash.scale.set(0.9, 0.09, 0.1);
    heli.add(place(flash, 0.12, 0.33, side * 0.265, [0, side * 0.05, 0]));
  }

  // frame, motor, servos and the shaft behind the canopy
  for (const side of [-1, 1]) {
    heli.add(place(kit.part(kit.box(0.7, 0.42, 0.04, 0.02), "ink"), -0.62, 0.36, side * 0.12));
  }
  heli.add(place(kit.part(kit.cylinder(0.11, 0.11, 0.26, 18), "steel"), -0.55, 0.72, 0));
  for (const [x, z] of [
    [-0.38, 0.17],
    [-0.38, -0.17],
    [-0.8, 0.17],
  ] as const) {
    heli.add(place(kit.part(kit.box(0.14, 0.1, 0.06, 0.015), "ink"), x, 0.55, z));
  }
  heli.add(rod(kit, [-0.15, 0.55, 0], [-0.15, ROTOR_Y + 0.04, 0], 0.03, "steel"));
  heli.add(place(kit.part(kit.cylinder(0.13, 0.13, 0.04, 20), "primary"), -0.15, 0.98, 0));

  // tail: boom on two braces, stabiliser, fins, tail rotor
  heli.add(rod(kit, [-0.9, 0.5, 0], [-2.36, 0.64, 0], 0.045, "panel"));
  for (const side of [-1, 1]) {
    heli.add(rod(kit, [-0.92, 0.18, side * 0.12], [-1.55, 0.57, 0], 0.014, "ink"));
  }
  heli.add(place(kit.part(kit.box(0.3, 0.025, 0.56, 0.01), "panel"), -1.7, 0.59, 0));
  const fin: Array<[number, number]> = [
    [-2.2, 0.64],
    [-2.42, 0.64],
    [-2.56, 1.02],
    [-2.42, 1.02],
  ];
  const keel: Array<[number, number]> = [
    [-2.24, 0.62],
    [-2.44, 0.62],
    [-2.5, 0.36],
    [-2.38, 0.36],
  ];
  heli.add(kit.part(extrudeXY(fin, 0.035), "primary"));
  heli.add(kit.part(extrudeXY(keel, 0.035), "primary"));
  const tailRotor = new Group();
  tailRotor.name = "tail-rotor";
  tailRotor.position.set(-2.36, 0.66, 0.07);
  tailRotor.add(
    place(kit.part(kit.cylinder(0.035, 0.035, 0.05, 12), "ink"), 0, 0, 0, [Math.PI / 2, 0, 0]),
  );
  for (const side of [-1, 1]) {
    tailRotor.add(place(kit.part(kit.box(0.07, 0.2, 0.015, 0.006), "panel"), 0, side * 0.12, 0.02));
  }
  heli.add(tailRotor);

  // skids
  for (const side of [-1, 1]) {
    heli.add(rod(kit, [-0.58, 0, side * 0.32], [0.5, 0, side * 0.32], 0.028, "ink"));
    heli.add(rod(kit, [0.5, 0, side * 0.32], [0.64, 0.09, side * 0.32], 0.028, "ink"));
    for (const x of [-0.35, 0.25]) {
      heli.add(rod(kit, [x, 0, side * 0.32], [x - 0.05, 0.19, side * 0.12], 0.02, "ink"));
    }
  }

  // main rotor: head, grips, two blades with red tips, and the blur of their disc
  const rotor = new Group();
  rotor.name = "rotor";
  rotor.position.set(-0.15, ROTOR_Y, 0);
  rotor.add(kit.part(kit.cylinder(0.08, 0.08, 0.12, 16), "ink"));
  for (const side of [-1, 1]) {
    rotor.add(place(kit.part(kit.box(0.2, 0.06, 0.08, 0.02), "primary"), side * 0.16, 0, 0));
    rotor.add(
      place(
        kit.part(kit.box(BLADE - 0.2, 0.035, 0.15, 0.015), "panel"),
        side * (0.24 + (BLADE - 0.2) / 2),
        0,
        0,
      ),
    );
    rotor.add(
      place(kit.part(kit.box(0.2, 0.036, 0.15, 0.015), "lead"), side * (BLADE + 0.14), 0, 0),
    );
  }
  heli.add(rotor);
  const disc = kit.part(kit.cylinder(BLADE + 0.24, BLADE + 0.24, 0.004, 48), "panel", {
    opacity: 0.22,
  });
  disc.name = "disc";
  heli.add(place(disc, -0.15, ROTOR_Y, 0));

  return { heli, rotor, tailRotor, disc };
}

/* ------------------------------------------------------------------ the field */

function hangar(kit: Kit) {
  const hut = new Group();
  const r = 1.25;
  const length = 2.6;
  const arch = new Shape();
  arch.absarc(0, 0, r, 0, Math.PI, false);
  arch.lineTo(r, 0);
  const shell = new ExtrudeGeometry(arch, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 28,
  });
  shell.translate(0, 0, -length / 2);
  hut.add(kit.part(shell, "sky"));
  for (const z of [-0.65, 0, 0.65]) {
    const band = kit.part(
      new ExtrudeGeometry(
        (() => {
          const s = new Shape();
          s.absarc(0, 0, r + 0.04, 0, Math.PI, false);
          s.lineTo(-r, 0);
          s.absarc(0, 0, r, Math.PI, 0, true);
          return s;
        })(),
        { depth: 0.06, bevelEnabled: false, curveSegments: 28 },
      ),
      "sky",
    );
    hut.add(place(band, 0, 0, z - 0.03));
  }
  // the door on the front, with its rails
  hut.add(place(kit.part(kit.box(1.3, 0.95, 0.04, 0.02), "steel"), 0, 0.48, length / 2 + 0.01));
  for (const x of [-0.33, 0, 0.33]) {
    hut.add(
      place(
        kit.part(kit.box(0.02, 0.9, 0.01, 0.005), "ink", { ink: false }),
        x,
        0.48,
        length / 2 + 0.035,
      ),
    );
  }
  hut.add(place(kit.part(kit.box(1.5, 0.05, 0.06, 0.01), "ink"), 0, 0.98, length / 2 + 0.03));
  return hut;
}

function cone(kit: Kit) {
  const marker = new Group();
  marker.add(place(kit.part(kit.box(0.26, 0.03, 0.26, 0.01), "lead"), 0, 0.015, 0));
  marker.add(place(kit.part(kit.cylinder(0.025, 0.11, 0.3, 14), "lead"), 0, 0.18, 0));
  marker.add(place(kit.part(kit.cylinder(0.06, 0.075, 0.06, 14), "panel"), 0, 0.2, 0));
  return marker;
}

/** A folding table with a charger and three packs waiting their turn. */
function chargingTable(kit: Kit) {
  const table = new Group();
  table.add(place(kit.part(kit.box(1.1, 0.05, 0.5, 0.02), "panel"), 0, 0.5, 0));
  for (const x of [-0.48, 0.48]) table.add(rod(kit, [x, 0, 0], [x, 0.48, 0], 0.02, "steel"));
  table.add(place(kit.part(kit.box(0.34, 0.16, 0.28, 0.03), "ink"), -0.3, 0.61, 0));
  table.add(
    place(kit.part(kit.box(0.2, 0.07, 0.01, 0.005), "sky", { ink: false }), -0.3, 0.64, 0.145),
  );
  ["sky", "lead", "primary"].forEach((swatch, i) => {
    const pack = kit.part(kit.box(0.26, 0.09, 0.14, 0.025), swatch as "sky" | "lead" | "primary");
    table.add(
      place(pack, 0.12 + i * 0.12, 0.57 + (i === 1 ? 0.09 : 0), i === 1 ? 0 : (i - 1) * 0.08),
    );
  });
  return table;
}

/* ----------------------------------------------------------------- the cycle */

const CYCLE = 17;
const HOVER = 2.1;
const PAD: [number, number] = [0.2, 0.5];

/** Where the heli is in its cycle: height, drift, yaw and how fast the rotor turns (0–1). */
function flight(t: number) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  const up = ease((c - 2.6) / 2.2);
  const down = ease((c - 13) / 2.2);
  const airborne = up * (1 - down);
  const spin = 0.25 + 0.75 * (ease(c / 2.4) * (1 - ease((c - 15.2) / 1.8)));
  const drift = airborne * ease((c - 4.4) / 1.5) * (1 - ease((c - 12.2) / 1.2));
  return {
    height: airborne * (HOVER + 0.12 * wave(c, 3.4)),
    x: drift * 0.55 * Math.sin((c / 8) * TAU),
    z: drift * 0.4 * Math.sin((c / 4) * TAU),
    yaw: ease((c - 6.2) / 5.2) * TAU,
    spin,
    airborne,
  };
}

/* ------------------------------------------------------------------- diorama */

const FIELD = 10.2;

export const build: Build = (kit) => {
  const root = new Group();
  root.add(displayBase(kit, FIELD, "mat"));
  for (let i = 0; i < 8; i += 2) {
    const band = kit.part(kit.box(9.9 / 8, 0.006, 9.9, 0.002), "mat", { ink: false, tone: "base" });
    root.add(place(band, 0, 0.003, -4.95 + (9.9 / 8) * (i + 0.5), [0, Math.PI / 2, 0]));
  }

  // the pad: asphalt, a white ring, a yellow H, lights all round
  const pad = new Group();
  pad.position.set(PAD[0], 0, PAD[1]);
  pad.add(place(kit.part(kit.cylinder(2.55, 2.6, 0.08, 56), "steel"), 0, 0.04, 0));
  pad.add(
    place(kit.part(kit.cylinder(2.25, 2.25, 0.006, 56), "panel", { ink: false }), 0, 0.082, 0),
  );
  pad.add(
    place(kit.part(kit.cylinder(2.07, 2.07, 0.006, 56), "steel", { ink: false }), 0, 0.085, 0),
  );
  for (const x of [-0.45, 0.45]) {
    pad.add(
      place(kit.part(kit.box(0.26, 0.006, 1.5, 0.004), "primary", { ink: false }), x, 0.089, 0),
    );
  }
  pad.add(
    place(kit.part(kit.box(0.7, 0.006, 0.24, 0.004), "primary", { ink: false }), 0, 0.089, 0),
  );
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const light = kit.part(kit.cylinder(0.06, 0.07, 0.1, 12), i % 2 ? "sky" : "panel");
    pad.add(place(light, Math.cos(a) * 2.42, 0.13, Math.sin(a) * 2.42));
  }
  pad.rotation.y = -0.2;
  root.add(pad);

  root.add(place(hangar(kit), -3.65, 0, 2.5, [0, Math.PI / 2, 0]));
  root.add(place(chargingTable(kit), 3.2, 0, -3, [0, 0.6, 0]));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4 - 0.2;
    root.add(place(cone(kit), PAD[0] + Math.cos(a) * 3.05, 0, PAD[1] + Math.sin(a) * 3.05));
  }
  const sock = windsock(kit);
  root.add(place(sock.mast, 4.2, 0, -4.1));
  const palms = [
    { ...palm(kit, 2.7, 0.45), at: [-4.1, -1.2], turn: 1.2 },
    { ...palm(kit, 2.2, 0.5), at: [1.6, -4.4], turn: 3.4 },
    { ...palm(kit, 2.4, 0.4), at: [4.45, -0.7], turn: 5.2 },
  ];
  for (const p of palms) root.add(place(p.tree, p.at[0]!, 0, p.at[1]!, [0, p.turn, 0]));
  for (const [x, z, r] of [
    [-1.2, -4.5, 0.32],
    [-0.7, -4.6, 0.24],
    [4.5, 2.4, 0.3],
    [-4.5, 4.4, 0.26],
  ] as const) {
    root.add(place(kit.part(kit.sphere(r, 14), "grass"), x, r * 0.55, z));
  }

  // downwash: rings of flattened grass that run outwards while the heli is low
  const ripples = [0, 1, 2].map(() => {
    const ring = kit.part(new RingGeometry(0.86, 1, 48), "grass", { opacity: 0.5 });
    ring.material = (ring.material as ShaderMaterial).clone();
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(PAD[0], 0.1, PAD[1]);
    root.add(ring);
    return ring;
  });

  const { heli, rotor, tailRotor, disc } = helicopter(kit);
  heli.scale.setScalar(1.25);
  heli.rotation.order = "XZY";
  disc.material = (disc.material as ShaderMaterial).clone();
  kit.bake(live(rotor));
  kit.bake(live(tailRotor));
  kit.bake(heli);
  root.add(live(heli));
  const shadow = castShadow(kit, heli, 0.1, [disc, tailRotor]);
  root.add(live(shadow.flat));
  kit.bake(live(sock.sock));
  for (const p of palms) kit.bake(live(p.crown));
  kit.bake(root);
  const ghostRotor = shadow.ghost.getObjectByName("rotor") as Object3D;

  let last = 0;
  let turn = 0;
  return {
    root,
    view: { target: [0, 0.3, 0], height: 10.6, width: 15.8, azimuth: 40, elevation: 28 },
    still: 8.4,
    tick(t) {
      const f = flight(t);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      turn += f.spin * 26 * dt;

      const ahead = flight(t + 0.25);
      heli.position.set(PAD[0] + f.x, 0.09 + f.height, PAD[1] + f.z);
      // yaw in its own frame, then lean into the drift the way a heli tilts its disc to move
      heli.rotation.set((ahead.z - f.z) * 0.9, -0.5 + f.yaw, -(ahead.x - f.x) * 0.9);
      rotor.rotation.y = turn;
      tailRotor.rotation.z = turn * 4.6;
      (disc.material as ShaderMaterial).uniforms.uOpacity!.value = 0.24 * f.spin ** 2;
      follow(shadow.ghost, heli);
      ghostRotor.rotation.y = turn;

      const wash = f.airborne * (1 - clamp01((f.height - 1.2) / 1.6)) * f.spin;
      ripples.forEach((ring, i) => {
        const phase = (t / 1.3 + i / 3) % 1;
        ring.scale.setScalar(0.6 + phase * 2.6);
        (ring.material as ShaderMaterial).uniforms.uOpacity!.value = 0.55 * wash * (1 - phase);
        ring.position.set(heli.position.x, 0.1, heli.position.z);
      });

      sock.sock.rotation.y = 0.2 * wave(t, 3.1);
      sock.sock.rotation.z = -0.12 - 0.06 * wave(t, 2.1);
      for (const [i, p] of palms.entries()) {
        p.crown.rotation.z = 0.05 * wave(t, 4.4, i * 0.4) + 0.08 * wash;
        p.crown.rotation.x = 0.04 * wave(t, 5.3, i * 0.3);
      }
    },
  };
};
