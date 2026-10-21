import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { MOVING, STATIC } from "./geometry";
import { ShockLive } from "./live";
import { DROP_MM, HERTZ, MASS_KG, STOCK_CST } from "./model";

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
    {/* the chart recorder's paper */}
    <Solid paths={STATIC.chart} tone="mid" crease="faint" />
    <Line d={STATIC.chartFrame} tone="faint" />
    <Line d={STATIC.chartZero} tone="lo" />
    <Line d={STATIC.chartTicks} tone="lo" />
    <Line d={STATIC.chartEnds} tone="lo" />
    {/* the far guide rod, then the lower mount */}
    <Solid paths={STATIC.rods[0]!.collar} tone="lo" crease="faint" />
    <Solid paths={STATIC.rods[0]!.rod} tone="mid" crease="none" />
    <Solid paths={STATIC.clevis} tone="mid" crease="faint" />
    <Solid paths={STATIC.cheeks[0]!} tone="mid" crease="none" />
    <Solid paths={STATIC.eye} tone="hi" crease="none" />
    <Solid paths={STATIC.cheeks[1]!} tone="mid" crease="none" />
    <Solid paths={STATIC.bolt} tone="mid" crease="none" />
  </g>
);

const BODY = (
  <g key="body">
    <Solid paths={STATIC.foot} tone="hi" crease="none" />
    <Solid
      paths={STATIC.body}
      tone="hi"
      crease="none"
      lit
      inner={<Line d={STATIC.threads} tone="faint" />}
    />
    <Solid paths={STATIC.perch} tone="mid" crease="lo" />
    <Solid paths={STATIC.cap} tone="mid" crease="none" />
  </g>
);

const NEAR_ROD = (
  <g key="near-rod">
    <Solid paths={STATIC.rods[1]!.collar} tone="lo" crease="faint" />
    <Solid paths={STATIC.rods[1]!.rod} tone="mid" crease="none" />
  </g>
);

const CARRIAGE = (
  <g key="carriage">
    <Solid paths={MOVING.cup} tone="mid" crease="none" />
    <Solid paths={MOVING.clevis} tone="mid" crease="faint" />
    <Solid paths={MOVING.eye} tone="mid" crease="none" />
    <Solid paths={MOVING.bushings[0]!} tone="mid" crease="none" />
    <Solid paths={MOVING.carriage} tone="hi" crease="lo" />
    <Solid paths={MOVING.bushings[1]!} tone="mid" crease="none" />
    {MOVING.weights.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="none" />
    ))}
    <Solid paths={MOVING.spindle} tone="mid" crease="none" />
  </g>
);

const SCALE = (
  <g key="scale">
    <Solid paths={STATIC.scale} tone="mid" crease="faint" />
    <Line d={STATIC.scaleTicks.minor} tone="lo" />
    <Line d={STATIC.scaleTicks.major} tone="mid" />
    <Line d={STATIC.scaleTicks.zero} tone="hi" />
  </g>
);

const TOP = (
  <g key="top">
    <Solid paths={STATIC.top} tone="mid" crease="faint" />
    <Dots points={STATIC.topScrews} size={0.6} tone="mid" />
  </g>
);

const LABEL = `A drop test for one corner of a short-course truck. A carriage loaded with ${Math.round(MASS_KG * 1000)} grams, a quarter of the truck, rides two guide rods on top of a coil-over shock. It is let go ${DROP_MM} millimetres high and bounces on the spring while the oil in the shock slows it; a chart on the base records the bounce. The stock oil is ${STOCK_CST} cSt; the spring alone would bounce about ${HERTZ.toFixed(1)} times a second.`;

export function ShockArt() {
  return (
    <ShockLive
      label={LABEL}
      back={BACK}
      shaft={<Solid key="shaft" paths={MOVING.shaft} tone="hi" crease="none" />}
      body={BODY}
      nearRod={NEAR_ROD}
      carriage={CARRIAGE}
      scale={SCALE}
      pointer={<Solid key="pointer" paths={MOVING.pointer} tone="hi" crease="none" />}
      top={TOP}
    />
  );
}
