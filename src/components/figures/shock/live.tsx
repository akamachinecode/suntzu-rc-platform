"use client";

import * as React from "react";
import { translateAlong } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import { BENCH_CLASS, setDot, setPath, useBench } from "../bench/live";
import { springAt, traceDot, traceOf } from "./geometry";
import { CST, DROP_MM, STOCK_CST, WINDOW_S, dropOf, heightAt, readoutOf, spokenOf } from "./model";
import { HEIGHT, P, WIDTH } from "./view";

// The drop is shown six times slower than it happens.
const SLOW = 6;
const HOLD = 1;
const LIFT = 1.2;
const CYCLE = HOLD + WINDOW_S * SLOW + LIFT;
const TOUR: Array<[number, number]> = [
  [0, STOCK_CST],
  [6.5, STOCK_CST],
  [8, 150],
  [14.5, 150],
  [16, 900],
  [22.5, 900],
  [24, STOCK_CST],
  [28, STOCK_CST],
];

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Where the carriage is, in mm above settled, at time `t` into the drop cycle. */
function cycleAt(cst: number, t: number) {
  const drop = dropOf(cst);
  const fall = WINDOW_S * SLOW;
  if (t < HOLD) return { x: DROP_MM, since: 0 };
  if (t < HOLD + fall) {
    const since = (t - HOLD) / SLOW;
    return { x: heightAt(drop, since), since };
  }
  const end = heightAt(drop, WINDOW_S);
  const u = smooth(Math.min(1, (t - HOLD - fall) / LIFT));
  return { x: end + (DROP_MM - end) * u, since: WINDOW_S };
}

const REST = springAt(DROP_MM);
const REST_TRACE = traceOf(dropOf(STOCK_CST));

interface Parts {
  label: string;
  back: React.ReactNode;
  shaft: React.ReactNode;
  body: React.ReactNode;
  nearRod: React.ReactNode;
  carriage: React.ReactNode;
  scale: React.ReactNode;
  pointer: React.ReactNode;
  top: React.ReactNode;
}

export function ShockLive({
  label,
  back,
  shaft,
  body,
  nearRod,
  carriage,
  scale,
  pointer,
  top,
}: Parts) {
  const clock = React.useRef(0);
  const drawn = React.useRef(-1);
  const bench = useBench({
    initial: STOCK_CST,
    min: CST.min,
    max: CST.max,
    nudge: 25,
    tour: TOUR,
    follow: 0.2,
    moving: () => true,
    fromPointer: (share) => CST.min + ((share - 0.15) / 0.7) * (CST.max - CST.min),
    readout: (value) => readoutOf(dropOf(value)),
    spoken: (value) => spokenOf(dropOf(value)),
    label:
      "Shock oil viscosity for the drop test. Arrow keys make the oil thicker or thinner; 0 goes back to the stock 350 cSt.",
    draw: (root, value, dt, calm) => {
      const cst = Math.round(value);
      if (calm) clock.current = HOLD + WINDOW_S * SLOW;
      else clock.current = (clock.current + dt) % CYCLE;
      const { x, since } = cycleAt(cst, clock.current);
      const move = translateAlong(P, [0, 0, x]);
      for (const name of ["shaft", "carriage", "pointer"]) {
        root.querySelector(`[data-node="${name}"]`)?.setAttribute("transform", move);
      }
      const coil = springAt(x);
      setPath(root, "spring-back", coil.back);
      setPath(root, "spring-front", coil.front);
      if (drawn.current !== cst) {
        drawn.current = cst;
        setPath(root, "trace", traceOf(dropOf(cst)));
      }
      setDot(root, "trace-dot", traceDot(since, heightAt(dropOf(cst), since)));
    },
  });

  return (
    <div {...bench} className={BENCH_CLASS}>
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {back}
        <path data-node="trace" className="iso-line" data-tone="hi" d={REST_TRACE} />
        <g className="iso-dots" data-tone="hi">
          <circle data-node="trace-dot" r={0.9} {...dotAt(traceDot(0, DROP_MM))} />
        </g>
        <path data-node="spring-back" className="iso-line" data-tone="mid" d={REST.back} />
        <g data-node="shaft" transform={translateAlong(P, [0, 0, DROP_MM])}>
          {shaft}
        </g>
        {body}
        <path data-node="spring-front" className="iso-line" data-tone="hi" d={REST.front} />
        {nearRod}
        <g data-node="carriage" transform={translateAlong(P, [0, 0, DROP_MM])}>
          {carriage}
        </g>
        {scale}
        <g data-node="pointer" transform={translateAlong(P, [0, 0, DROP_MM])}>
          {pointer}
        </g>
        {top}
      </IsoFigure>
    </div>
  );
}

const dotAt = ([cx, cy]: [number, number]) => ({ cx, cy });
