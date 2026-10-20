/**
 * The truth behind the balance figure. A trainer's balance point is usually set between
 * 25% and 33% of the wing chord back from the leading edge; the manual gives the exact spot.
 * The beam stands in for the plane: the knife edge is the mark, a fixed weight is the
 * airframe without its battery, and the rider is the battery you slide fore and aft.
 * Positions are millimetres, positive towards the nose.
 */

export const CHORD = 240; // mm, a 1.4 m trainer
export const MARK_PCT = 30; // the knife edge sits here
export const RANGE_PCT = [25, 33] as const;

export const AIRFRAME = { grams: 1150, at: -20 }; // its own balance point, 20 mm behind the mark
export const BATTERY = { grams: 185, label: "3S 2200 mAh" };
export const SLIDE = { from: 55, to: 240 }; // where the battery can sit in the fuselage

/** Distance along the chord, in mm behind the leading edge, of a point `x` mm ahead of the mark. */
const pctOf = (x: number) => MARK_PCT - (x / CHORD) * 100;
/** And back: how far ahead of the mark a chord percentage sits. */
export const aheadOf = (pct: number) => ((MARK_PCT - pct) * CHORD) / 100;

export function cgOf(battery: number) {
  const total = AIRFRAME.grams + BATTERY.grams;
  const x = (AIRFRAME.grams * AIRFRAME.at + BATTERY.grams * battery) / total;
  return { x, pct: pctOf(x), grams: total };
}

/** Where the battery must sit for the CG to land exactly on the mark. */
export const BALANCED_AT = -(AIRFRAME.grams * AIRFRAME.at) / BATTERY.grams;

export function verdictOf(pct: number) {
  if (pct < RANGE_PCT[0]) return "nose heavy";
  if (pct > RANGE_PCT[1]) return "tail heavy";
  return "in range";
}

/**
 * How far the beam leans. Its own weight hangs below the knife edge, so it settles where
 * that weight's pull balances the off-centre load: tan θ = offset / PENDULUM. Stops stop it.
 */
export const PENDULUM = 60; // mm
export const STOP_DEG = 8;
export const leanOf = (x: number) =>
  Math.max(-STOP_DEG, Math.min(STOP_DEG, (Math.atan(x / PENDULUM) * 180) / Math.PI));

export const readoutOf = (battery: number) => {
  const cg = cgOf(battery);
  return `battery ${Math.round(battery)} mm ahead · CG ${cg.pct.toFixed(1)}% · ${verdictOf(cg.pct)}`;
};

export const spokenOf = (battery: number) => {
  const cg = cgOf(battery);
  return `Battery ${Math.round(battery)} millimetres ahead of the mark. Balance point at ${cg.pct.toFixed(1)} percent of the chord, ${verdictOf(cg.pct)}.`;
};
