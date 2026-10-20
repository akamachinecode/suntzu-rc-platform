/**
 * The truth behind Fig 1: a transmitter stick, a standard servo and a pushrod
 * linkage driving an elevator. Every number the figure shows comes from here.
 *
 * Lengths are millimetres, angles degrees. The linkage lies in the x–z plane:
 * x runs from the servo towards the tail, z is up.
 */

/** Stick throw either side of centre, as a gimbal tilt. */
export const STICK_TILT = 25;

/** Standard servo signal: 1000–2000 µs, centred on 1500, repeated every 20 ms. */
export const PULSE_CENTRE = 1500;
export const PULSE_SPAN = 500;
export const FRAME_MS = 20;

/** A typical analogue servo turns about 90° over the full 1000 µs range. */
export const SERVO_TRAVEL = 45;
/** Speed of a standard servo: about 0.15 s per 60° unloaded, so 400°/s. */
export const SERVO_SPEED = 60 / 0.15;

/** Servo output spline centre, arm hole radius. */
export const SPLINE = { x: 30, z: 38 } as const;
export const ARM_HOLE = 12;

/** Elevator hinge line and the control horn hole, which sits straight below it. */
export const HINGE = { x: 135, z: 74 } as const;
export const HORN_HOLE = 24;

/** Elevator chord from the hinge line to the trailing edge. */
export const ELEVATOR_CHORD = 44;

/** The pushrod is cut so arm and horn are both square to it at neutral. */
export const PUSHROD = HINGE.x - SPLINE.x;

const RAD = Math.PI / 180;

export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/** Stick position, −1 … 1, to the pulse the receiver sends the servo. */
export const pulseOf = (stick: number) => PULSE_CENTRE + PULSE_SPAN * clamp(stick, -1, 1);

/** Pulse width to the angle the servo is commanded to hold. */
export const servoTargetOf = (pulse: number) =>
  ((clamp(pulse, 1000, 2000) - PULSE_CENTRE) / PULSE_SPAN) * SERVO_TRAVEL;

/** Where the servo arm's pushrod hole sits, in the x–z plane. */
export function armHoleOf(servo: number): [number, number] {
  const a = servo * RAD;
  return [SPLINE.x + ARM_HOLE * Math.sin(a), SPLINE.z + ARM_HOLE * Math.cos(a)];
}

/** Where the horn hole sits for an elevator deflection (positive is trailing edge up). */
export function hornHoleOf(elevator: number): [number, number] {
  const a = elevator * RAD;
  return [HINGE.x + HORN_HOLE * Math.sin(a), HINGE.z - HORN_HOLE * Math.cos(a)];
}

/**
 * Solve the four-bar linkage: the elevator angle at which the horn hole sits
 * exactly one pushrod length from the arm hole. Bisection is plenty here.
 */
export function elevatorOf(servo: number): number {
  const [tx, tz] = armHoleOf(servo);
  const miss = (elevator: number) => {
    const [hx, hz] = hornHoleOf(elevator);
    return Math.hypot(hx - tx, hz - tz) - PUSHROD;
  };
  let low = -70;
  let high = 70;
  for (let step = 0; step < 48; step++) {
    const mid = (low + high) / 2;
    if (miss(mid) > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

/** Trailing-edge throw in millimetres, the number you'd read on a ruler. */
export const throwOf = (elevator: number) => ELEVATOR_CHORD * Math.sin(elevator * RAD);

export const MAX_ELEVATOR = elevatorOf(SERVO_TRAVEL);
export const MIN_ELEVATOR = elevatorOf(-SERVO_TRAVEL);

const signed = (value: number, digits = 0) => {
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return (0).toFixed(digits);
  return `${value > 0 ? "+" : "−"}${text}`;
};

export interface State {
  stick: number;
  servo: number;
}

export const REST: State = { stick: 0, servo: 0 };

/** The card's readout. */
export function readoutOf({ stick, servo }: State) {
  const elevator = elevatorOf(servo);
  return `${Math.round(pulseOf(stick))} µs · servo ${signed(servo)}° · elevator ${signed(elevator, 1)}°`;
}

/** What a screen reader hears. */
export function spokenOf({ stick, servo }: State) {
  const elevator = elevatorOf(servo);
  const move = Math.abs(elevator) < 0.05 ? "neutral" : elevator > 0 ? "up" : "down";
  return `Stick ${Math.round(stick * 100)} percent, pulse ${Math.round(pulseOf(stick))} microseconds, servo ${Math.round(servo)} degrees, elevator ${Math.abs(elevator).toFixed(1)} degrees ${move}, trailing edge ${Math.abs(throwOf(elevator)).toFixed(1)} millimetres`;
}

/** Move the servo towards its target at its real top speed. */
export function stepServo(state: State, dt: number, calm: boolean) {
  const target = servoTargetOf(pulseOf(state.stick));
  if (calm) {
    state.servo = target;
    return true;
  }
  const most = SERVO_SPEED * dt;
  const gap = target - state.servo;
  state.servo += clamp(gap, -most, most);
  if (Math.abs(target - state.servo) < 1e-3) state.servo = target;
  return state.servo === target;
}
