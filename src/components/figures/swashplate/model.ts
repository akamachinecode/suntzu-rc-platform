/**
 * The truth behind the swashplate bench: a 450-class head driven 120° CCPM.
 * Three servos hold the bottom ring of the swashplate. Raise all three together and the
 * plate slides up the shaft (collective: both blades gain pitch). Push one side up and the
 * plate tilts (cyclic): the top ring turns with the head, so each blade's pitch rises and
 * falls once per turn. Lengths in millimetres, angles in degrees.
 */

export const SERVO_ANGLES = [60, 180, 300] as const; // where the three servos sit round the shaft
export const LOWER_BALL_R = 25; // servo links meet the bottom ring here
export const UPPER_BALL_R = 22; // pitch links leave the top ring here
export const ARM_LEAD = 60; // the pitch-link ball leads its blade by this much round the head
export const LEVER = UPPER_BALL_R * Math.sin((ARM_LEAD * Math.PI) / 180); // ≈ 19 mm

export const COLLECTIVE_MM = 3.4; // swashplate travel either side of mid stick
export const CYCLIC_DEG = 7; // plate tilt at full cyclic

const RAD = Math.PI / 180;
const clamp = (value: number) => Math.min(1, Math.max(-1, value));

export interface Input {
  collective: number; // −1 … 1, stick down to stick up
  cyclic: number; // −1 … 1, stick back to stick forward
}

/** Height of the plate's centre above mid stick (mm) and its tilt (degrees, nose down +). */
export const plateOf = ({ collective, cyclic }: Input) => ({
  lift: COLLECTIVE_MM * clamp(collective),
  tilt: CYCLIC_DEG * clamp(cyclic),
});

/** How far a point on the plate at `angle` (0 = nose, +x) and `radius` sits above the centre. */
export const riseAt = (tilt: number, angle: number, radius: number) =>
  -Math.tan(tilt * RAD) * radius * Math.cos(angle * RAD);

/** A blade's pitch (degrees) when the head has turned it to `azimuth` (0 = over the nose). */
export function pitchOf(input: Input, azimuth: number) {
  const { lift, tilt } = plateOf(input);
  const z = lift + riseAt(tilt, azimuth + ARM_LEAD, UPPER_BALL_R);
  return Math.asin(Math.max(-1, Math.min(1, z / LEVER))) / RAD;
}

/** Pitch over one turn: the lowest and highest a blade sees, and the mean (the collective). */
export function sweepOf(input: Input) {
  let low = Infinity;
  let high = -Infinity;
  for (let a = 0; a < 360; a += 3) {
    const p = pitchOf(input, a);
    low = Math.min(low, p);
    high = Math.max(high, p);
  }
  return { low, high, mean: pitchOf({ ...input, cyclic: 0 }, 0) };
}

const signed = (value: number) =>
  `${value > 0.05 ? "+" : value < -0.05 ? "−" : ""}${Math.abs(value).toFixed(1)}°`;

export const readoutOf = (input: Input) => {
  const { tilt } = plateOf(input);
  const sweep = sweepOf(input);
  const plate =
    Math.abs(tilt) < 0.1
      ? "plate level"
      : `plate ${Math.abs(tilt).toFixed(1)}° ${tilt > 0 ? "forward" : "back"}`;
  return `collective ${signed(sweep.mean)} · ${plate} · blades ${signed(sweep.low)} to ${signed(sweep.high)}`;
};

export const spokenOf = (input: Input) => {
  const { tilt } = plateOf(input);
  const sweep = sweepOf(input);
  return `Collective pitch ${sweep.mean.toFixed(1)} degrees. Swashplate tilted ${Math.abs(tilt).toFixed(1)} degrees ${tilt >= 0 ? "forward" : "back"}. Each blade's pitch swings between ${sweep.low.toFixed(1)} and ${sweep.high.toFixed(1)} degrees as it goes round.`;
};
