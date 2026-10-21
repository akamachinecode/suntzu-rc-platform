/**
 * The truth behind the differential bench: the rear axle of a 1/10 short-course truck (a
 * Team Associated Pro2 SC10: 282 mm wide on tyres about 47 mm wide, so about 235 mm between
 * tyre centres, on a typical 110 mm short-course tyre) rolling at a steady 20 km/h. In a corner the outside wheel travels a bigger circle
 * than the inside one in the same time, so it has to turn faster. An open diff lets it: the
 * case turns at the average of the two wheels, and the spider gears turn on their pin to
 * make up the difference.
 */

export const SPEED_KMH = 20;
export const TYRE_MM = 110; // tyre diameter
export const TRACK_MM = 235; // rear tyre centre to centre
export const TIGHTEST_M = 0.7; // turn radius at full lock, measured at the middle of the axle
export const SIDE_TEETH = 16;
export const SPIDER_TEETH = 10;

const CIRCUMFERENCE = (Math.PI * TYRE_MM) / 1000; // m
/** Both wheels, and the case, going straight. */
export const STRAIGHT_RPM = ((SPEED_KMH / 3.6) * 60) / CIRCUMFERENCE;

export interface Axle {
  steer: number; // -1 full right … 0 straight … 1 full left
  radius: number | null; // m, null going straight
  left: number; // wheel rpm
  right: number;
  carrier: number;
  spiders: number; // rpm of each spider gear on its pin
}

/** Wheel speeds for a steering position from -1 (full right lock) to 1 (full left). */
export function axleAt(steer: number): Axle {
  const s = Math.max(-1, Math.min(1, steer));
  if (Math.abs(s) < 0.02) {
    return {
      steer: 0,
      radius: null,
      left: STRAIGHT_RPM,
      right: STRAIGHT_RPM,
      carrier: STRAIGHT_RPM,
      spiders: 0,
    };
  }
  const radius = TIGHTEST_M / Math.abs(s);
  const half = TRACK_MM / 2000;
  const inner = (STRAIGHT_RPM * (radius - half)) / radius;
  const outer = (STRAIGHT_RPM * (radius + half)) / radius;
  const left = s > 0 ? inner : outer;
  const right = s > 0 ? outer : inner;
  return {
    steer: s,
    radius,
    left,
    right,
    carrier: (left + right) / 2,
    spiders: ((right - left) / 2) * (SIDE_TEETH / SPIDER_TEETH),
  };
}

const rpm = (value: number) => Math.round(value).toLocaleString("en-US");

export function readoutOf(a: Axle) {
  if (a.radius === null) return `straight · both wheels ${rpm(a.left)} rpm · spiders still`;
  const side = a.steer > 0 ? "left" : "right";
  return `${side} ${a.radius.toFixed(1)} m · left ${rpm(a.left)} · right ${rpm(a.right)} rpm`;
}

export function spokenOf(a: Axle) {
  if (a.radius === null)
    return `Going straight: both wheels turn ${rpm(a.left)} rpm and the spider gears don't turn on their pin.`;
  const side = a.steer > 0 ? "left" : "right";
  return `Turning ${side} on a ${a.radius.toFixed(1)} metre radius: left wheel ${rpm(a.left)} rpm, right wheel ${rpm(a.right)} rpm, spider gears ${rpm(Math.abs(a.spiders))} rpm on their pin.`;
}
