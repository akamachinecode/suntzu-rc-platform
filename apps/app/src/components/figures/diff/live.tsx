"use client";

import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
import { BENCH_CLASS, LiveSolid, paint, setPath, useBench } from "../bench/live";
import { SIDE_DEPTH, frameOf, sideTeeth, type Angles } from "./frame";
import { axleAt, readoutOf, spokenOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

// The drawing turns at 2.5% of the real speed, like a strobe, so the gears can be followed.
const STROBE = 0.025;
const RING_TO_PINION = 40 / 13;
const TOUR: Array<[number, number]> = [
  [0, 0],
  [1.2, 0],
  [2.8, 1],
  [5, 1],
  [7, -1],
  [9.2, -1],
  [10.8, 0],
  [12, 0],
];

type Lines = Array<{ d: string; alpha: number }>;

/** Rewrites a group of lines that each carry an opacity. */
function setFaded(root: Element, name: string, lines: Lines, tone = "lo") {
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
      ([alpha, d]) =>
        `<g opacity="${alpha}"><path class="iso-line" data-tone="${tone}" d="${d}"/></g>`,
    )
    .join("");
}

function setDots(root: Element, name: string, points: Array<[number, number]>) {
  const circles = root.querySelectorAll(`[data-node="${name}"] circle`);
  circles.forEach((circle, index) => {
    const point = points[index];
    circle.setAttribute("visibility", point ? "visible" : "hidden");
    if (!point) return;
    circle.setAttribute("cx", point[0].toFixed(2));
    circle.setAttribute("cy", point[1].toFixed(2));
  });
}

/** Placeholders the frame loop fills: lines with opacity, and bolt-circle dots. */
const Teeth = ({ name }: { name: string }) => <g data-node={name} />;
const Bolts = ({ name, count }: { name: string; count: number }) => (
  <g data-node={name} className="iso-dots" data-tone="mid">
    {Array.from({ length: count }, (_, index) => (
      <circle key={index} r={0.7} />
    ))}
  </g>
);

const START: Angles = { carrier: 0, left: 0, right: 0, spiders: 0, pinion: 0 };
const REST = frameOf(START);

interface Parts {
  label: string;
  back: React.ReactNode;
  pinion: React.ReactNode;
  ring: React.ReactNode;
  sideFar: React.ReactNode;
  sideNear: React.ReactNode;
  plate: React.ReactNode;
  near: React.ReactNode;
  rim: React.ReactNode;
  nut: React.ReactNode;
}

export function DiffLive({
  label,
  back,
  pinion,
  ring,
  sideFar,
  sideNear,
  plate,
  near,
  rim,
  nut,
}: Parts) {
  const angles = React.useRef<Angles>({ ...START });
  const order = React.useRef("");

  const bench = useBench({
    initial: 0,
    min: -1,
    max: 1,
    nudge: 0.1,
    tour: TOUR,
    follow: 0.25,
    moving: () => true,
    fromPointer: (share) => Math.max(-1, Math.min(1, (0.5 - share) / 0.34)),
    readout: (value) => readoutOf(axleAt(value)),
    spoken: (value) => spokenOf(axleAt(value)),
    label:
      "Steering for the rear axle. Arrow keys steer left and right; 0 goes straight. The wheel speeds and spider gears follow.",
    draw: (root, value, dt, calm) => {
      const axle = axleAt(value);
      const a = angles.current;
      if (!calm) {
        const turn = (rpm: number) => -(rpm / 60) * Math.PI * 2 * STROBE * dt;
        a.carrier += turn(axle.carrier);
        a.left += turn(axle.left);
        a.right += turn(axle.right);
        a.spiders += turn(axle.spiders);
        a.pinion -= turn(axle.carrier) * RING_TO_PINION;
      }
      const f = frameOf(a);
      const teeth = sideTeeth(a);
      setFaded(root, "ring-teeth", f.ringTeeth);
      setDots(root, "ring-bolts", f.ringBolts);
      setDots(root, "bridge-bolts", f.bridgeBolts);
      paint(root.querySelector('[data-node="bridge"]'), f.bridge);
      setFaded(root, "pinion-teeth", f.pinionTeeth);
      setFaded(root, "tread-near", f.treadNear);
      setFaded(root, "tread-far", f.treadFar);
      setPath(root, "spokes-near", f.spokesNear);
      setPath(root, "spokes-far", f.spokesFar);
      setFaded(root, "side-near-teeth", teeth.near);
      setFaded(root, "side-far-teeth", teeth.far);
      for (const item of f.cage) {
        paint(root.querySelector(`[data-node="${item.key}"]`), item.paths);
        if (item.teeth) setFaded(root, `${item.key}-teeth`, item.teeth, "mid");
        if (item.face) setPath(root, `${item.key}-face`, item.face);
      }
      // Paint the cage back to front: the pin, spiders and posts swing past the side gears.
      const depths = [
        ...f.cage.map((item) => [item.key, item.depth] as const),
        ["side-near", SIDE_DEPTH.near] as const,
        ["side-far", SIDE_DEPTH.far] as const,
      ].sort((p, q) => p[1] - q[1]);
      const next = depths.map(([key]) => key).join(" ");
      if (next !== order.current) {
        order.current = next;
        const cage = root.querySelector('[data-node="cage"]');
        for (const [key] of depths) {
          const item = cage?.querySelector(`[data-item="${key}"]`);
          if (item) cage?.appendChild(item);
        }
      }
    },
  });

  return (
    <div {...bench} className={BENCH_CLASS}>
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {back}
        <path data-node="spokes-far" className="iso-line" data-tone="mid" d={REST.spokesFar} />
        {/* the pinion, and the ring gear it drives */}
        {pinion}
        <Teeth name="pinion-teeth" />
        {ring}
        <Teeth name="ring-teeth" />
        <Bolts name="ring-bolts" count={6} />
        <g data-node="cage">
          <g data-item="side-far">
            {sideFar}
            <Teeth name="side-far-teeth" />
          </g>
          <g data-item="side-near">
            {sideNear}
            <Teeth name="side-near-teeth" />
          </g>
          {REST.cage.map((item) => (
            <g key={item.key} data-item={item.key}>
              <LiveSolid
                node={item.key}
                paths={item.paths}
                tone={item.key.startsWith("spider") ? "hi" : "mid"}
                lit={item.key.startsWith("spider")}
              />
              {item.teeth ? <Teeth name={`${item.key}-teeth`} /> : null}
              {item.face ? (
                <path
                  data-node={`${item.key}-face`}
                  className="iso-line"
                  data-tone="hi"
                  d={item.face}
                />
              ) : null}
            </g>
          ))}
        </g>
        <LiveSolid node="bridge" paths={REST.bridge} tone="mid" />
        <Bolts name="bridge-bolts" count={2} />
        {plate}
        {near}
        <Teeth name="tread-near" />
        {rim}
        <path data-node="spokes-near" className="iso-line" data-tone="mid" d={REST.spokesNear} />
        {nut}
      </IsoFigure>
    </div>
  );
}
