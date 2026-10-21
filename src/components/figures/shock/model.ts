/**
 * The truth behind the shock dyno: a drop test on one corner of a 1/10 short-course truck.
 * The carriage weighs a quarter of a 1928 g Team Associated Pro2 SC10; the spring is chosen
 * so the corner bounces at about 4.5 Hz, a typical rate for a truck this size. The piston
 * stays the same while the oil changes, and damping grows in proportion to the oil's
 * viscosity: thicker oil, slower shaft.
 */

export const MASS_KG = 1.928 / 4;
export const SPRING_N_PER_M = 384;
export const DROP_MM = 20; // the carriage is let go this far above where it settles
export const STOCK_CST = 350; // the Pro2 SC10 ships with 30wt (350 cSt) oil
export const CST = { min: 100, max: 1000 };
// Damping per cSt for this piston, set so the stock oil gives a damping ratio of 0.6.
const DAMPING_PER_CST = (0.6 * 2 * Math.sqrt(SPRING_N_PER_M * MASS_KG)) / STOCK_CST;

export const OMEGA = Math.sqrt(SPRING_N_PER_M / MASS_KG); // rad/s
export const HERTZ = OMEGA / (2 * Math.PI);

export const dampingRatioOf = (cst: number) =>
  (DAMPING_PER_CST * cst) / (2 * Math.sqrt(SPRING_N_PER_M * MASS_KG));

/** Team Associated's scale, where 25wt is 275 cSt and 50wt is 650 cSt, in 2.5wt steps. */
export function weightOf(cst: number) {
  const wt = Math.round(((cst + 100) / 15) * 2) / 2;
  if (wt < 25 || wt > 50) return null;
  return `${Number.isInteger(wt) ? wt : wt.toFixed(1)}wt`;
}

export const WINDOW_S = 0.8; // how much of the drop the chart and the animation show
const STEP_S = 0.0005;

export interface Drop {
  cst: number;
  zeta: number;
  trace: Array<[number, number]>; // seconds, mm above the settled height
  overshoot: number; // mm below the settled height at the deepest point
  settle: number | null; // seconds until it stays within 1 mm, null if not within the window
}

const cache = new Map<number, Drop>();

/** Lets the carriage go DROP_MM high and follows it: m·x'' = −k·x − c·x'. */
export function dropOf(cstIn: number): Drop {
  const cst = Math.round(Math.min(CST.max, Math.max(CST.min, cstIn)));
  const hit = cache.get(cst);
  if (hit) return hit;
  const c = DAMPING_PER_CST * cst;
  let x = DROP_MM / 1000;
  let v = 0;
  let low = 0;
  let settle: number | null = null;
  const trace: Array<[number, number]> = [[0, DROP_MM]];
  for (let t = STEP_S, i = 1; t <= WINDOW_S + 1e-9; t += STEP_S, i++) {
    v += ((-SPRING_N_PER_M * x - c * v) / MASS_KG) * STEP_S;
    x += v * STEP_S;
    const mm = x * 1000;
    low = Math.min(low, mm);
    if (Math.abs(mm) > 1) settle = null;
    else if (settle === null) settle = t;
    if (i % 8 === 0) trace.push([t, mm]);
  }
  const drop = { cst, zeta: dampingRatioOf(cst), trace, overshoot: -low, settle };
  cache.set(cst, drop);
  return drop;
}

/** Where the carriage is at time t after the release, in mm above its settled height. */
export function heightAt(drop: Drop, t: number) {
  if (t <= 0) return DROP_MM;
  const step = drop.trace[1]![0];
  const i = Math.min(drop.trace.length - 2, Math.floor(t / step));
  const [t0, x0] = drop.trace[i]!;
  const [, x1] = drop.trace[i + 1]!;
  return x0 + ((x1 - x0) * (t - t0)) / step;
}

const oil = (d: Drop) => {
  const wt = weightOf(d.cst);
  return wt ? `${d.cst} cSt (${wt})` : `${d.cst} cSt`;
};

export function readoutOf(d: Drop) {
  const settle = d.settle === null ? "still moving" : `settles ${d.settle.toFixed(2)} s`;
  return `${oil(d)} · bounces ${d.overshoot.toFixed(1)} mm past · ${settle}`;
}

export function spokenOf(d: Drop) {
  const settle =
    d.settle === null
      ? "and it hasn't settled within the chart"
      : `and it settles within a millimetre after ${d.settle.toFixed(2)} seconds`;
  return `Shock oil ${oil(d)}. Dropped from ${DROP_MM} millimetres, the corner overshoots by ${d.overshoot.toFixed(1)} millimetres ${settle}.`;
}
