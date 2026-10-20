/**
 * The truth behind the hero figure: a typical electric high-wing trainer and the
 * order it comes apart in. World units are millimetres divided by UNIT.
 */

export const UNIT = 4; // mm per world unit

/** Real dimensions of a 1.4 m class electric trainer, in millimetres. */
export const TRAINER = {
  span: 1400,
  length: 1100,
  chord: 240,
  prop: { diameter: 254, pitch: 178 }, // 10 × 7 in
  dihedral: 3, // degrees per side
  battery: { cells: 3, mAh: 2200, length: 105, width: 34, height: 26 },
} as const;

export type Assembly =
  "prop" | "motor" | "hatch" | "wing" | "battery" | "radio" | "fin" | "stab" | "gear";

/**
 * Leaving order, outside first: nothing has to pass through a part that is still home.
 * The wing goes before the battery and radio, which lift out of the cabin under it.
 */
export const STAGGER: Assembly[] = [
  "prop",
  "motor",
  "hatch",
  "wing",
  "battery",
  "radio",
  "fin",
  "stab",
  "gear",
];

/** How each assembly comes off, in world units: its real disassembly direction. */
export const MOVES: Record<Assembly, [number, number, number]> = {
  prop: [92, 0, 0],
  motor: [50, 0, 0],
  hatch: [0, 0, 60],
  wing: [0, 0, 128],
  battery: [0, 0, 52],
  radio: [0, 0, 46],
  fin: [-34, 0, 58],
  stab: [-42, 0, 14],
  gear: [0, 0, -24],
};

export const NAMES: Record<Assembly, { name: string; does: string }> = {
  prop: {
    name: "Propeller and spinner",
    does: "A 10 × 7 prop: 254 mm across, 178 mm of pitch per turn.",
  },
  motor: { name: "Motor and mount", does: "A brushless outrunner bolted to the firewall." },
  hatch: { name: "Battery hatch", does: "Usually held by magnets, so a pack swaps in seconds." },
  wing: { name: "Wing", does: "1.4 m of high wing with 3° of dihedral and two ailerons." },
  battery: { name: "Battery", does: "A 3S 2200 mAh LiPo, slid fore and aft to set the balance." },
  radio: { name: "Radio gear", does: "Receiver, speed controller and the tail servos." },
  fin: { name: "Fin and rudder", does: "Keeps the nose straight and yaws it on command." },
  stab: {
    name: "Stabiliser and elevator",
    does: "Keeps the pitch steady and pitches it on command.",
  },
  gear: { name: "Landing gear", does: "A steerable nosewheel and two music-wire main legs." },
};

/** Gap between assemblies along the explode, as a share of the whole travel. */
export const STEP = 0.06;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** How far one assembly is out, 0 … 1, when the explode as a whole is at `p`. */
export function shareOf(index: number, p: number) {
  const span = 1 - STEP * (STAGGER.length - 1);
  return smooth(clamp01((p - index * STEP) / span));
}

export function phaseOf(p: number) {
  if (p < 0.005) return "assembled";
  if (p > 0.995) return "apart";
  return "coming apart";
}
