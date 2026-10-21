/**
 * The truth behind the gearing bench: the drivetrain of a Team Associated Pro2 SC10 RTR.
 * A Reedy 3300 kV brushless motor on a 2S pack (7.4 V) turns an 87-tooth spur through the
 * pinion, and the transmission's 2.6:1 internal ratio turns the wheels. Final drive ratio
 * = spur ÷ pinion × internal ratio; speed = motor rpm ÷ FDR × the tyre's circumference.
 * kV is rpm per volt with nothing attached, so these speeds are no-load and theoretical:
 * the truck runs slower on the ground.
 */

export const KV = 3300;
export const VOLTS = 7.4;
export const SPUR = 87;
export const INTERNAL = 2.6;
export const STOCK_PINION = 18;
export const TYRE_MM = 110;
export const PINIONS = { min: 12, max: 24 };
/** 48-pitch gears: teeth per inch of pitch diameter. */
export const PITCH = 48;

export const MOTOR_RPM = KV * VOLTS;

export interface Gearing {
  pinion: number;
  fdr: number;
  rollout: number; // mm the truck travels per motor turn
  wheelRpm: number;
  kmh: number;
}

export function gearingOf(teeth: number): Gearing {
  const pinion = Math.round(Math.min(PINIONS.max, Math.max(PINIONS.min, teeth)));
  const fdr = (SPUR / pinion) * INTERNAL;
  const circumference = Math.PI * TYRE_MM;
  const wheelRpm = MOTOR_RPM / fdr;
  return {
    pinion,
    fdr,
    rollout: circumference / fdr,
    wheelRpm,
    kmh: (wheelRpm * circumference * 60) / 1e6,
  };
}

export const STOCK = gearingOf(STOCK_PINION);

/** Theoretical top speed in km/h for a pinion on another pack, e.g. 3S at 11.1 V. */
export function speedOn(teeth: number, volts: number) {
  const fdr = (SPUR / teeth) * INTERNAL;
  return (((KV * volts) / fdr) * Math.PI * TYRE_MM * 60) / 1e6;
}

export const readoutOf = (g: Gearing) =>
  `${g.pinion}T pinion · ${g.fdr.toFixed(2)}:1 · ${g.rollout.toFixed(1)} mm a turn · ${Math.round(g.kmh)} km/h`;

export const spokenOf = (g: Gearing) =>
  `${g.pinion} tooth pinion: a final drive ratio of ${g.fdr.toFixed(2)} to 1, ${g.rollout.toFixed(1)} millimetres of travel for every turn of the motor, and a theoretical top speed of ${Math.round(g.kmh)} kilometres an hour.`;

/** Pitch radius of a 48-pitch gear, in mm. */
export const radiusOf = (teeth: number) => ((teeth / PITCH) * 25.4) / 2;
