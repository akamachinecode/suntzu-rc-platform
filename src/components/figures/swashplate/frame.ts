import { depthOf, iso, type Flat, type SolidPaths } from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe.mjs";
import { onLine } from "./geometry";
import {
  ARM_LEAD,
  LOWER_BALL_R,
  SERVO_ANGLES,
  UPPER_BALL_R,
  pitchOf,
  plateOf,
  riseAt,
  type Input,
} from "./model";
import { BLADE, GRIP, HUB_Z, LINK, LOWER, P, PITCH_LINK, POST, SERVO, UPPER } from "./view";

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
function rod(a: Vec, b: Vec, r: number) {
  const d: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return G.disc(0, Math.hypot(d[0], d[1], d[2]), r, G.frameAlong(a, unit(d)), P, { steps: 12 });
}
const ball = (c: Vec, r: number) => G.sphereOf(c, r, P, { steps: 20 });

/** A blade's root section: a thin lens, leading edge first. */
const AIRFOIL: Array<[number, number]> = [
  [-11, 0],
  [-6.5, -1.5],
  [5, -2.2],
  [14, -1.5],
  [16.5, 0],
  [14, 1.7],
  [5, 2.4],
  [-6.5, 1.9],
];

export interface BladeFrame {
  depth: number;
  pitch: number;
  ball: SolidPaths;
  link: SolidPaths;
  grip: SolidPaths;
  arm: SolidPaths;
  armBall: SolidPaths;
  blade: SolidPaths;
  bolt: Flat;
  /** Whether its pitch-link ball sits behind the top ring. */
  ballBehind: boolean;
}

export interface HeadFrame {
  arms: SolidPaths[];
  links: SolidPaths[];
  lower: SolidPaths;
  lowerBalls: SolidPaths[];
  pin: SolidPaths;
  upper: SolidPaths;
  hub: SolidPaths;
  spindle: SolidPaths;
  /** Back to front. */
  blades: [BladeFrame, BladeFrame];
}

export function headOf(input: Input, turn: number): HeadFrame {
  const { lift, tilt } = plateOf(input);
  const t = Math.tan(tilt * RAD);
  const normal = unit([t, 0, 1]);
  const plate = G.frameAlong([0, 0, LOWER.z + lift], normal);
  const on = (angle: number, radius: number, z: number): Vec => [
    radius * Math.cos(angle * RAD),
    radius * Math.sin(angle * RAD),
    z + lift + riseAt(tilt, angle, radius),
  ];

  // servos: each arm swings so its link reaches the ball on the bottom ring
  const arms: SolidPaths[] = [];
  const links: SolidPaths[] = [];
  const lowerBalls = SERVO_ANGLES.map((angle) => {
    const top = on(angle, LOWER_BALL_R, LOWER.z + LOWER.h / 2);
    const pivotXY = onLine(angle, SERVO.pivotR, 0);
    const pivot: Vec = [pivotXY[0], pivotXY[1], SERVO.pivotZ];
    const reach = Math.max(-1, Math.min(1, (top[2] - LINK - SERVO.pivotZ) / SERVO.arm));
    const beta = Math.asin(reach);
    const inward = onLine(angle, -Math.cos(beta) * SERVO.arm, 0);
    const end: Vec = [
      pivot[0] + inward[0],
      pivot[1] + inward[1],
      pivot[2] + Math.sin(beta) * SERVO.arm,
    ];
    arms.push(rod(pivot, end, 1.7));
    links.push(rod(add(end, [0, 0, 1.6]), add(top, [0, 0, -1.6]), 1.3));
    return ball(top, 2.2);
  });

  const pinFrom = on(0, LOWER.r - 1, LOWER.z + LOWER.h / 2);
  const pinTo = on(0, POST.x - 2.5, LOWER.z + LOWER.h / 2);

  const blades = [0, 180].map((offset): BladeFrame => {
    const azimuth = turn + offset;
    const pitch = pitchOf(input, azimuth);
    const a = azimuth * RAD;
    const th = pitch * RAD;
    const out: Vec = [Math.cos(a), Math.sin(a), 0];
    const ahead: Vec = [-Math.sin(a), Math.cos(a), 0];
    const chord = unit(add([0, 0, Math.sin(th)], ahead, Math.cos(th)));
    const up = unit(add([0, 0, Math.cos(th)], ahead, -Math.sin(th)));
    const hub: Vec = [0, 0, HUB_Z];
    const F = G.frameOf(hub, out, chord, up);
    const ballAt = on(azimuth + ARM_LEAD, UPPER_BALL_R, UPPER.z + UPPER.h / 2);
    const armBall = add(ballAt, [0, 0, PITCH_LINK]);
    const gripSide = add(add(hub, out, (GRIP.from + GRIP.to) / 2 - 2), chord, 8);
    const centre: Vec = [0, 0, UPPER.z + lift];
    return {
      depth: depthOf(add(hub, out, (BLADE.from + BLADE.to) / 2), P),
      pitch,
      ball: ball(ballAt, 2.4),
      link: rod(add(ballAt, [0, 0, 2]), add(armBall, [0, 0, -2]), 1.3),
      grip: G.prismOf(
        F,
        [
          [-8, -6],
          [8, -6],
          [8, 6],
          [-8, 6],
        ],
        GRIP.from,
        GRIP.to,
        P,
      ),
      arm: rod(gripSide, armBall, 1.5),
      armBall: ball(armBall, 2),
      blade: G.prismOf(F, AIRFOIL, BLADE.from, BLADE.to, P),
      bolt: iso(add(add(hub, out, GRIP.to - 6), up, 6), P),
      ballBehind: depthOf(ballAt, P) < depthOf(centre, P),
    };
  });
  blades.sort((x, y) => x.depth - y.depth);

  const t0 = turn * RAD;
  const along: Vec = [Math.cos(t0), Math.sin(t0), 0];
  const across: Vec = [-Math.sin(t0), Math.cos(t0), 0];
  return {
    arms,
    links,
    lower: G.disc(0, LOWER.h, LOWER.r, plate, P, { steps: 48 }),
    lowerBalls,
    pin: rod(pinFrom, pinTo, 1.2),
    upper: G.disc(LOWER.h, LOWER.h + UPPER.h, UPPER.r, plate, P, { steps: 44 }),
    hub: G.prismOf(
      G.frameOf([0, 0, HUB_Z - 8], [0, 0, 1], along, across),
      [
        [-9, -7],
        [9, -7],
        [9, 7],
        [-9, 7],
      ],
      0,
      16,
      P,
    ),
    spindle: rod(
      add([0, 0, HUB_Z], along, -GRIP.from - 1),
      add([0, 0, HUB_Z], along, GRIP.from + 1),
      2.6,
    ),
    blades: [blades[0]!, blades[1]!],
  };
}
