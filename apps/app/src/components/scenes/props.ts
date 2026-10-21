/** Pieces every diorama shares: the display base, palms, a windsock, clouds. */
import { Group, Vector3 } from "three";
import { place, rod, type Kit, type Swatch } from "./toy";

const TAU = Math.PI * 2;

/**
 * The display base a model stands on: a black plinth with a yellow label plate, and the
 * ground slab on top, its top face at y = 0.
 */
export function displayBase(kit: Kit, size: number, ground: Swatch) {
  const base = new Group();
  base.add(place(kit.part(kit.box(size + 0.6, 0.8, size + 0.6, 0.16), "ink"), 0, -0.75, 0));
  base.add(place(kit.part(kit.box(1.8, 0.36, 0.04, 0.03), "primary"), 0, -0.75, size / 2 + 0.31));
  base.add(place(kit.part(kit.box(size, 0.36, size, 0.14), ground), 0, -0.18, 0));
  return base;
}

export function palm(kit: Kit, height: number, lean: number) {
  const tree = new Group();
  const rings = 7;
  let top = new Vector3();
  for (let i = 0; i < rings; i++) {
    const r = 0.12 - i * 0.008;
    const y = (i + 0.5) * (height / rings);
    const x = lean * (y / height) ** 2;
    const ring = kit.part(kit.cylinder(r * 0.86, r, height / rings, 14), i % 2 ? "muted" : "panel");
    tree.add(place(ring, x, y, 0, [0, 0, -lean * 0.35 * (y / height)]));
    top = new Vector3(x, y + height / rings / 2, 0);
  }
  const crown = new Group();
  crown.position.copy(top);
  for (let i = 0; i < 7; i++) {
    const frond = new Group();
    frond.rotation.y = (i / 7) * TAU + 0.3;
    frond.add(
      place(kit.part(kit.box(0.5, 0.03, 0.22, 0.012), "grass"), 0.24, 0.06, 0, [0, 0, 0.3]),
    );
    frond.add(
      place(kit.part(kit.box(0.56, 0.03, 0.18, 0.012), "grass"), 0.7, 0.02, 0, [0, 0, -0.5]),
    );
    crown.add(frond);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const nut = kit.part(kit.sphere(0.065, 10), "steel");
    crown.add(place(nut, Math.cos(a) * 0.09, -0.05, Math.sin(a) * 0.09));
  }
  tree.add(crown);
  return { tree, crown };
}

export function windsock(kit: Kit) {
  const mast = new Group();
  mast.add(rod(kit, [0, 0, 0], [0, 1.55, 0], 0.035, "panel"));
  const sock = new Group();
  sock.position.set(0, 1.48, 0);
  [0.15, 0.13, 0.11, 0.09].forEach((r, i) => {
    const band = kit.part(kit.cylinder(r - 0.02, r, 0.25, 16), i % 2 ? "panel" : "lead");
    sock.add(place(band, 0.15 + i * 0.25, 0, 0, [0, 0, Math.PI / 2]));
  });
  mast.add(sock);
  return { mast, sock };
}

export function cloud(kit: Kit, scale: number) {
  const puff = new Group();
  for (const [x, y, z, r] of [
    [0, 0, 0, 0.55],
    [0.55, -0.08, 0.1, 0.42],
    [-0.55, -0.1, -0.05, 0.4],
    [0.15, 0.32, 0, 0.4],
    [1, -0.16, 0, 0.28],
    [-0.95, -0.18, 0.05, 0.25],
  ] as const) {
    puff.add(place(kit.part(kit.sphere(r * scale, 18), "panel"), x * scale, y * scale, z * scale));
  }
  return puff;
}
