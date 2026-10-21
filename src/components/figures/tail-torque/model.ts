/**
 * The truth behind the torque bench: a 450-class helicopter in a hover, its body free to
 * turn on a turntable against a torsion spring. The main rotor needs about 1 N·m to keep
 * turning, and the same torque pushes the body the other way. The tail rotor, about half a
 * metre back, has to push sideways hard enough to cancel it: torque ÷ arm. Its push grows
 * roughly in step with its pitch at small angles. Figures are typical, not measured.
 */

export const MAIN_TORQUE = 1.05; // N·m at hover (about 300 W at 2,700 rpm)
export const ARM = 0.52; // m, main shaft to tail rotor
export const NEEDED = MAIN_TORQUE / ARM; // N of tail thrust to hold heading
export const HOVER_PITCH = 8; // degrees of tail pitch that gives it
const PUSH_PER_DEG = NEEDED / HOVER_PITCH; // N per degree, small-angle
export const PITCH = { from: -4, to: 16 } as const;
export const SPRING = MAIN_TORQUE / 10; // N·m per degree: no tail at all twists it 10°
export const STOP_DEG = 12;
const G = 9.80665;

export const thrustOf = (pitch: number) => PUSH_PER_DEG * pitch;
/** Net yaw torque on the body, N·m: positive turns it against the rotor (nose right). */
export const netOf = (pitch: number) => thrustOf(pitch) * ARM - MAIN_TORQUE;
/** Where the spring lets the body settle, degrees, against its stops. */
export const twistOf = (pitch: number) =>
  Math.max(-STOP_DEG, Math.min(STOP_DEG, netOf(pitch) / SPRING));

const verdictOf = (net: number) =>
  Math.abs(net) < 0.03 ? "holds its heading" : net < 0 ? "yaws with the torque" : "yaws against it";

export const readoutOf = (pitch: number) => {
  const net = netOf(pitch);
  return `tail pitch ${pitch.toFixed(1)}° · push ${Math.round((thrustOf(pitch) / G) * 1000)} g · ${verdictOf(net)}`;
};

export const spokenOf = (pitch: number) => {
  const net = netOf(pitch);
  return `Tail rotor pitch ${pitch.toFixed(1)} degrees, pushing ${Math.round((thrustOf(pitch) / G) * 1000)} grams sideways. Net torque ${net.toFixed(2)} newton metres: the helicopter ${verdictOf(net)}.`;
};
