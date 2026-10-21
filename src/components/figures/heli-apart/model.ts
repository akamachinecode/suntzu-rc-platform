/**
 * The truth behind the helicopter hero figure: a typical 450-class electric helicopter and
 * the order it comes apart in. World units are millimetres divided by UNIT.
 */

export const UNIT = 4; // mm per world unit

/** Typical dimensions of a 450-class electric helicopter, in millimetres. */
export const HELI = {
  rotor: 720, // main rotor diameter: 721 on a Blade 450 3D, 734 on an Align 450LP
  blade: 325,
  length: 650,
  tailRotor: 100,
  mainGear: 121, // teeth, on an 11-tooth pinion (Align 450L)
  shaft: 5,
  boom: 12,
  battery: { cells: 3, mAh: 2200, length: 105, width: 34, height: 26 },
} as const;

export type Assembly =
  | "blades"
  | "head"
  | "swash"
  | "canopy"
  | "battery"
  | "servos"
  | "electronics"
  | "motor"
  | "tail"
  | "skids";

/** Leaving order, outside first: nothing has to pass through a part that is still home. */
export const STAGGER: Assembly[] = [
  "blades",
  "head",
  "swash",
  "canopy",
  "battery",
  "servos",
  "electronics",
  "motor",
  "tail",
  "skids",
];

/** How each assembly comes off, in world units: its real disassembly direction. */
export const MOVES: Record<Assembly, [number, number, number]> = {
  blades: [0, 0, 60],
  head: [0, 0, 40],
  swash: [0, 0, 26],
  canopy: [30, 0, 34],
  battery: [40, 0, 0],
  servos: [0, 0, 22],
  electronics: [0, 22, 0],
  motor: [0, 0, 44],
  tail: [-38, 0, 0],
  skids: [0, 0, -16],
};

export const NAMES: Record<Assembly, { name: string; does: string }> = {
  blades: {
    name: "Main blades",
    does: "Two blades of about 325 mm, folded back for the shelf. They make all the lift.",
  },
  head: {
    name: "Rotor head",
    does: "The hub, the spindle and the grips that hold each blade and twist it to change its pitch.",
  },
  swash: {
    name: "Swashplate",
    does: "Two rings on the main shaft: the bottom one tilts with the servos, the top one spins with the head.",
  },
  canopy: {
    name: "Canopy",
    does: "The painted shell over the nose. It keeps the wind off the electronics.",
  },
  battery: { name: "Battery", does: "A 3S 2200 mAh LiPo on the tray under the canopy." },
  servos: {
    name: "Cyclic servos",
    does: "Three servos at 120° that tilt and lift the swashplate between them.",
  },
  electronics: {
    name: "Electronics",
    does: "Speed controller, receiver and the flybarless unit: the gyro that steadies everything.",
  },
  motor: {
    name: "Motor and pinion",
    does: "A brushless motor whose small pinion gear drives the big main gear.",
  },
  tail: {
    name: "Tail",
    does: "Boom, fins, tail servo and the tail rotor that stops the body spinning against the main rotor.",
  },
  skids: {
    name: "Landing skids",
    does: "Two tubes on a plastic gear that the heli sits and lands on.",
  },
};

/** Gap between assemblies along the explode, as a share of the whole travel. */
export const STEP = 0.055;
