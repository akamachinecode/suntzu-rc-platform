/**
 * The truth behind the truck hero figure: a 1/10 short-course truck in the shape of a Team
 * Associated Pro2 SC10 (538 mm long, 282 mm wide, 322 mm wheelbase, 1928 g), and the order
 * it comes apart in. World units are millimetres divided by UNIT.
 */

export const UNIT = 4; // mm per world unit

export const TRUCK = {
  length: 538,
  width: 282,
  wheelbase: 322,
  grams: 1928,
  tyre: { diameter: 110, width: 47 },
  battery: { cells: 2, length: 138, width: 47, height: 25 },
  motor: { kv: 3300, diameter: 36, length: 55 },
  spur: 87,
  pinion: 18,
} as const;

export type Assembly =
  | "body"
  | "left-wheels"
  | "right-wheels"
  | "shocks"
  | "battery"
  | "electronics"
  | "steering"
  | "motor"
  | "drivetrain"
  | "suspension";

/** Leaving order, outside first: nothing has to pass through a part that is still home. */
export const STAGGER: Assembly[] = [
  "body",
  "left-wheels",
  "right-wheels",
  "shocks",
  "battery",
  "electronics",
  "steering",
  "motor",
  "drivetrain",
  "suspension",
];

/** How each assembly comes off, in world units: its real direction out of the truck. */
export const MOVES: Record<Assembly, [number, number, number]> = {
  body: [0, 0, 70],
  "left-wheels": [0, 32, 0],
  "right-wheels": [0, -32, 0],
  shocks: [0, 0, 30],
  battery: [0, 0, 34],
  electronics: [0, 26, 6],
  steering: [10, 0, 24],
  motor: [0, 30, 0],
  drivetrain: [-30, 0, 22],
  suspension: [0, 0, -16],
};

export const NAMES: Record<Assembly, { name: string; does: string }> = {
  body: { name: "Body shell", does: "A painted polycarbonate pickup body on four posts." },
  "left-wheels": { name: "Left wheels", does: "110 mm tyres on hex hubs, held by one nut each." },
  "right-wheels": { name: "Right wheels", does: "The same on the other side." },
  shocks: {
    name: "Shocks",
    does: "Four oil-filled coil-overs: springs to hold the truck up, oil to stop the bounce.",
  },
  battery: { name: "Battery", does: "A 2S hard-case LiPo along the middle of the chassis." },
  electronics: {
    name: "Speed control and receiver",
    does: "The ESC that turns battery power into motor power, and the receiver in its box.",
  },
  steering: {
    name: "Steering",
    does: "The steering servo, its saver and the links out to the front hubs.",
  },
  motor: { name: "Motor and pinion", does: "A 3300 kV brushless motor with an 18-tooth pinion." },
  drivetrain: {
    name: "Transmission",
    does: "The 87-tooth spur, the gearbox with its differential, and the driveshafts to the rear wheels.",
  },
  suspension: {
    name: "Suspension arms",
    does: "Four arms and their hubs, which let each wheel move up and down on its own.",
  },
};

/** Gap between assemblies along the explode, as a share of the whole travel. */
export const STEP = 0.055;
