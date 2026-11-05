import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { Faded } from "../apart/faded";
import { MOTOR_ART, STATIC } from "./geometry";
import { GearingLive } from "./live";
import { INTERNAL, KV, SPUR, STOCK_PINION, TYRE_MM, VOLTS } from "./model";

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
    <Solid paths={STATIC.tyre} tone="hi" crease="none" />
  </g>
);

const RIM = (
  <g key="rim">
    <Solid
      paths={STATIC.rim}
      tone="mid"
      crease="none"
      inner={<Line d={STATIC.rimLip} tone="lo" />}
    />
  </g>
);

const MIDDLE = (
  <g key="middle">
    <Solid paths={STATIC.hub} tone="mid" crease="none" />
    <Solid paths={STATIC.shaft} tone="hi" crease="none" />
    <Solid paths={STATIC.cup} tone="mid" crease="none" />
    {STATIC.legs.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid
      paths={STATIC.case}
      tone="mid"
      crease="faint"
      inner={<Line d={STATIC.caseSeam} tone="faint" />}
    />
    <Dots points={STATIC.caseScrews} size={0.55} tone="mid" />
    <Solid paths={STATIC.outputCap} tone="mid" crease="none" />
  </g>
);

const MOTOR = (
  <g key="motor">
    <Solid paths={MOTOR_ART.endCap} tone="mid" crease="none" />
    <Solid paths={MOTOR_ART.can} tone="hi" crease="none" />
    <Faded lines={MOTOR_ART.vents} />
  </g>
);

const PLATE = (
  <g key="plate">
    <Solid
      paths={STATIC.plate}
      tone="mid"
      crease="faint"
      inner={<Line d={STATIC.slot} tone="lo" />}
    />
  </g>
);

const SPUR_PARTS = (
  <g key="spur">
    <Solid paths={STATIC.spur} tone="hi" crease="none" />
  </g>
);

const FRONT = (
  <g key="front">
    <Solid paths={STATIC.slipper} tone="mid" crease="none" />
    <Solid paths={STATIC.nut} tone="mid" crease="none" />
    <Solid paths={MOTOR_ART.shaft} tone="hi" crease="none" />
  </g>
);

const LABEL = `A short-course truck's drivetrain on a bench: a ${KV} kV brushless motor on a ${VOLTS} V pack, its pinion on a ${SPUR}-tooth spur gear with a slipper clutch, a transmission with a ${INTERNAL} to 1 ratio inside, and a ${TYRE_MM} mm rear wheel. Change the pinion and the motor slides along its slots to keep it in mesh; the ratio, the distance travelled per motor turn and the top speed follow. The stock pinion has ${STOCK_PINION} teeth.`;

export function GearingArt() {
  return (
    <GearingLive
      label={LABEL}
      back={BACK}
      rim={RIM}
      middle={MIDDLE}
      motor={MOTOR}
      plate={PLATE}
      screws={<Dots key="screws" points={MOTOR_ART.screws} size={0.9} tone="mid" />}
      spur={SPUR_PARTS}
      front={FRONT}
    />
  );
}
