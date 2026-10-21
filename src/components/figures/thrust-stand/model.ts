/**
 * The truth behind the thrust stand: a 1000 KV outrunner on a 3S pack swinging a 10 × 7 prop.
 * Motor: the standard DC model. Prop: the standard static coefficients, T = Ct·ρ·n²·D⁴ and
 * P = Cp·ρ·n³·D⁵. Ct and Cp are typical for a sport 10 × 7; every real prop differs a little,
 * which is exactly why people put them on a stand.
 */

export const PACK_VOLTS = 11.1; // 3S nominal
export const KV = 1000; // rpm per volt
export const WINDING_OHMS = 0.06;
export const IDLE_AMPS = 1.2;
const KT = 60 / (2 * Math.PI * KV); // N·m per amp

export const PROP = { diameter: 0.254, inches: "10 × 7", ct: 0.11, cp: 0.06 } as const;
const RHO = 1.225; // sea-level air, kg/m³
const G = 9.80665;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Servo-tester pulse for a throttle setting, 0 … 1. */
export const pulseOf = (throttle: number) => 1000 + 1000 * clamp(throttle, 0, 1);

export interface Operating {
  throttle: number;
  pulse: number;
  rpm: number;
  amps: number; // drawn from the battery
  watts: number;
  grams: number; // thrust
}

/** Steady state: the speed where the motor's torque equals the prop's drag torque. */
export function operatingAt(throttle: number): Operating {
  const t = clamp(throttle, 0, 1);
  const volts = PACK_VOLTS * t; // the ESC chops the pack down to this average
  const d = PROP.diameter;
  const propTorque = (n: number) => (PROP.cp * RHO * n * n * d ** 5) / (2 * Math.PI); // n in rev/s
  let low = 0;
  let high = (KV * PACK_VOLTS) / 60;
  for (let step = 0; step < 50; step++) {
    const n = (low + high) / 2;
    const motorAmps = propTorque(n) / KT + IDLE_AMPS;
    const free = (KV * (volts - motorAmps * WINDING_OHMS)) / 60;
    if (free > n) low = n;
    else high = n;
  }
  const n = t < 0.04 ? 0 : (low + high) / 2;
  const motorAmps = n === 0 ? 0 : propTorque(n) / KT + IDLE_AMPS;
  const amps = motorAmps * t; // average battery current through the ESC
  const thrust = PROP.ct * RHO * n * n * d ** 4;
  return {
    throttle: t,
    pulse: pulseOf(t),
    rpm: n * 60,
    amps,
    watts: amps * PACK_VOLTS,
    grams: (thrust / G) * 1000,
  };
}

export const FULL = operatingAt(1);

export const readoutOf = (o: Operating) =>
  `${Math.round(o.throttle * 100)}% · ${Math.round(o.rpm / 10) * 10} rpm · ${o.amps.toFixed(1)} A · ${Math.round(o.grams)} g`;

export const spokenOf = (o: Operating) =>
  `Throttle ${Math.round(o.throttle * 100)} percent: ${Math.round(o.rpm)} rpm, ${o.amps.toFixed(1)} amps, ${Math.round(o.watts)} watts, ${Math.round(o.grams)} grams of thrust`;
