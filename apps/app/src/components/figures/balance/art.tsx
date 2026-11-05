import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { STATIC } from "./geometry";
import { BalanceLive } from "./live";
import { AIRFRAME, BALANCED_AT, BATTERY } from "./model";

const BACK = (
  <g key="back">
    <path className="iso-halo" d={STATIC.halo} />
    {STATIC.feet.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid paths={STATIC.base} tone="mid" crease="faint" />
    <Line d={STATIC.groove} tone="lo" />
    <Line d={STATIC.screwRings} tone="lo" />
    <Dots points={STATIC.screws} size={0.5} tone="mid" />
    <Solid paths={STATIC.label} tone="lo" crease="none" />
    <Line d={STATIC.labelLine} tone="faint" />
    <Line d={STATIC.labelRule} tone="lo" free />
    {STATIC.stops.map((stop, index) => (
      <g key={index}>
        <Solid paths={stop.foot} tone="lo" crease="faint" />
        <Solid paths={stop.post} tone="mid" crease="none" />
        <Solid paths={stop.cap} tone="lo" crease="faint" />
      </g>
    ))}
    <Solid paths={STATIC.scaleFoot} tone="lo" crease="faint" />
    <Solid paths={STATIC.scalePost} tone="mid" crease="faint" />
    <Line d={STATIC.scaleMinor} tone="lo" />
    <Line d={STATIC.scaleMajor} tone="mid" />
    <Line d={STATIC.scaleZero} tone="hi" />
    <Solid paths={STATIC.collar} tone="mid" crease="faint" />
    <Solid paths={STATIC.pillar} tone="mid" crease="none" />
    <Solid paths={STATIC.block} tone="mid" crease="faint" />
    <Solid paths={STATIC.knife} tone="hi" crease="lo" />
  </g>
);

const LABEL = `A beam balance standing in for a trainer. The knife edge is the balance mark, 30 percent of the way back along the wing chord. A stack of lab weights, ${AIRFRAME.grams} grams, is the airframe without its battery, ${Math.abs(AIRFRAME.at)} millimetres behind the mark. A ${BATTERY.grams} gram battery slides along the nose end; about ${Math.round(BALANCED_AT)} millimetres ahead of the mark, the beam sits level.`;

export function BalanceArt() {
  return <BalanceLive label={LABEL} back={BACK} />;
}
