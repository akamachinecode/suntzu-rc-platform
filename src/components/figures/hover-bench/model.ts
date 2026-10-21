/**
 * The truth behind the hover bench: a 450-class helicopter tied down on a bench scale.
 * Its weight and its hover pitch come from real setups: the Blade 450 3D weighs 762 g ready
 * to fly, and a T-Rex 450 hovers at about +6° of collective. With the governor holding the
 * headspeed, lift grows roughly in step with pitch, so the scale reads the weight minus the
 * lift and drops to zero at the hover. Past that the helicopter lifts against its strap.
 */

export const WEIGHT = 762; // g, ready to fly
export const HOVER_PITCH = 6; // degrees of collective
export const HEADSPEED = 2600; // rpm, held by the governor
export const PITCH = { from: -4, to: 11 } as const;
export const STRAP = 3; // world units (12 mm) of slack before the strap holds it

export const liftOf = (pitch: number) => (WEIGHT * pitch) / HOVER_PITCH;
export const scaleOf = (pitch: number) => Math.max(0, WEIGHT - liftOf(pitch));
/** How far the skids rise off the scale, 0 … 1 of the strap's slack. */
export const riseOf = (pitch: number) =>
  Math.min(1, Math.max(0, (liftOf(pitch) - WEIGHT) / (WEIGHT * 0.25)));

const verdictOf = (pitch: number) => {
  const spare = liftOf(pitch) - WEIGHT;
  if (Math.abs(spare) < 15) return "hovers";
  return spare > 0 ? "climbs, held by the strap" : "sits on the scale";
};

export const readoutOf = (pitch: number) =>
  `pitch ${pitch >= 0 ? "+" : "−"}${Math.abs(pitch).toFixed(1)}° · lift ${Math.max(0, Math.round(liftOf(pitch)))} g · scale ${Math.round(scaleOf(pitch))} g · ${verdictOf(pitch)}`;

export const spokenOf = (pitch: number) =>
  `Collective pitch ${pitch.toFixed(1)} degrees at ${HEADSPEED} rpm. The rotor lifts ${Math.max(0, Math.round(liftOf(pitch)))} grams of the helicopter's ${WEIGHT}, so the scale reads ${Math.round(scaleOf(pitch))} grams: it ${verdictOf(pitch)}.`;
