"use client";

import * as React from "react";
import { translateAlong } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import * as G from "@/components/iso/lathe.mjs";
import { spokes } from "../bench/shapes";
import { BENCH_CLASS, LiveSolid, paint, setPath, useBench } from "../bench/live";
import { SPUR_AXIS, STOCK_MOTOR, WHEEL_AXIS, motorAt, pinionOf } from "./geometry";
import {
  INTERNAL,
  MOTOR_RPM,
  PINIONS,
  SPUR,
  STOCK_PINION,
  gearingOf,
  radiusOf,
  readoutOf,
  spokenOf,
} from "./model";
import { HEIGHT, P, SPUR_Y, WHEEL, WIDTH } from "./view";

// The drawing turns at half a percent of the real speed, like a strobe.
const STROBE = 0.005;
const FADE: [number, number] = [0.05, 0.42];
const TOUR: Array<[number, number]> = [
  [0, STOCK_PINION],
  [1.4, STOCK_PINION],
  [3.4, PINIONS.min],
  [5.6, PINIONS.min],
  [8.2, PINIONS.max],
  [10.4, PINIONS.max],
  [12, STOCK_PINION],
  [13.4, STOCK_PINION],
];

type Lines = Array<{ d: string; alpha: number }>;

function setFaded(root: Element, name: string, lines: Lines) {
  const el = root.querySelector(`[data-node="${name}"]`);
  if (!el) return;
  const groups = new Map<number, string>();
  for (const { d, alpha } of lines) {
    if (alpha < 0.02) continue;
    const step = Math.round(alpha * 20) / 20;
    groups.set(step, (groups.get(step) ?? "") + d);
  }
  el.innerHTML = [...groups]
    .map(
      ([alpha, d]) => `<g opacity="${alpha}"><path class="iso-line" data-tone="lo" d="${d}"/></g>`,
    )
    .join("");
}

const Lines = ({ name }: { name: string }) => <g data-node={name} />;
const REST = pinionOf(STOCK_PINION);

interface Parts {
  label: string;
  back: React.ReactNode;
  rim: React.ReactNode;
  middle: React.ReactNode;
  motor: React.ReactNode;
  plate: React.ReactNode;
  screws: React.ReactNode;
  spur: React.ReactNode;
  front: React.ReactNode;
}

export function GearingLive({
  label,
  back,
  rim,
  middle,
  motor,
  plate,
  screws,
  spur,
  front,
}: Parts) {
  const angles = React.useRef({ pinion: 0, spur: 0, wheel: 0 });
  const teeth = React.useRef(STOCK_PINION);

  const bench = useBench({
    initial: STOCK_PINION,
    min: PINIONS.min,
    max: PINIONS.max,
    nudge: 1,
    tour: TOUR,
    follow: 0.18,
    moving: () => true,
    fromPointer: (share) => PINIONS.min + ((share - 0.15) / 0.7) * (PINIONS.max - PINIONS.min),
    readout: (value) => readoutOf(gearingOf(value)),
    spoken: (value) => spokenOf(gearingOf(value)),
    label:
      "Pinion size on the gearing bench. Arrow keys add or remove a tooth; 0 goes back to the stock 18-tooth pinion.",
    draw: (root, value, dt, calm) => {
      const n = Math.round(value);
      const a = angles.current;
      if (!calm) {
        const turn = (rpm: number) => (rpm / 60) * Math.PI * 2 * STROBE * dt;
        a.pinion += turn(MOTOR_RPM);
        a.spur -= turn((MOTOR_RPM * n) / SPUR);
        a.wheel += turn((MOTOR_RPM * n) / SPUR / INTERNAL);
      }
      if (teeth.current !== n) {
        teeth.current = n;
        const [x, z] = motorAt(n);
        const move = translateAlong(P, [x - STOCK_MOTOR[0], 0, z - STOCK_MOTOR[1]]);
        for (const name of ["motor", "screws"]) {
          root.querySelector(`[data-node="${name}"]`)?.setAttribute("transform", move);
        }
        paint(root.querySelector('[data-node="pinion"]'), pinionOf(n).paths);
      }
      const { F } = pinionOf(n);
      setFaded(
        root,
        "pinion-teeth",
        G.ribsOf(F, SPUR_Y.y0 - 0.5, SPUR_Y.y1 + 0.5, radiusOf(n), n, P, {
          phase: a.pinion,
          fade: FADE,
        }),
      );
      setFaded(
        root,
        "spur-teeth",
        G.ribsOf(SPUR_AXIS, SPUR_Y.y0, SPUR_Y.y1, radiusOf(SPUR), SPUR, P, {
          phase: a.spur,
          fade: FADE,
        }),
      );
      setFaded(
        root,
        "tread",
        G.ribsOf(WHEEL_AXIS, -WHEEL.y0 + 6, -WHEEL.y1 - 6, WHEEL.r, 34, P, {
          phase: a.wheel,
          fade: FADE,
        }),
      );
      setPath(root, "spokes", spokes(WHEEL_AXIS, -WHEEL.y0 - 1.5, 8, 30, 6, a.wheel, P));
    },
  });

  return (
    <div {...bench} className={BENCH_CLASS}>
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {back}
        <Lines name="tread" />
        {rim}
        <path
          data-node="spokes"
          className="iso-line"
          data-tone="mid"
          d={spokes(WHEEL_AXIS, -WHEEL.y0 - 1.5, 8, 30, 6, 0, P)}
        />
        {middle}
        <g data-node="motor">{motor}</g>
        {plate}
        <g data-node="screws">{screws}</g>
        {spur}
        <Lines name="spur-teeth" />
        {front}
        <LiveSolid node="pinion" paths={REST.paths} lit />
        <Lines name="pinion-teeth" />
      </IsoFigure>
    </div>
  );
}
