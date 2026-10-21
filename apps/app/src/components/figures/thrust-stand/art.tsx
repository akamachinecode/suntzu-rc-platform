import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import {
  BASE_ART,
  BATTERY_ART,
  CABLES,
  CELL_ART,
  DISPLAY_ART,
  ESC_ART,
  LEVER,
  LEVER_BACK,
  METER_ART,
  MOTOR_ART,
  PROP_DISC,
  TESTER_ART,
} from "./geometry";
import { ThrustStandLive } from "./live";
import { FULL, PROP } from "./model";

function Cable({ lead }: { lead: { d: string; ends: Array<[number, number]> } }) {
  return (
    <g className="tte-cable">
      <path className="tte-cable-body" d={lead.d} />
      <path className="tte-cable-core" d={lead.d} />
      {lead.ends.map(([x, y], index) => (
        <circle key={index} className="iso-wire-end" cx={x} cy={y} r={1.1} />
      ))}
    </g>
  );
}

const BASE = (
  <g key="base">
    <path className="iso-halo" d={BASE_ART.halo} />
    {BASE_ART.feet.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid paths={BASE_ART.slab} tone="mid" crease="faint" />
    <Line d={BASE_ART.groove} tone="lo" />
    <Line d={BASE_ART.screwRings} tone="lo" />
    <Dots points={BASE_ART.screws} size={0.5} tone="mid" />
    <Solid paths={BASE_ART.label} tone="lo" crease="none" />
    <Line d={BASE_ART.labelLine} tone="faint" />
    <Line d={BASE_ART.labelRule} tone="lo" free />
  </g>
);

const BACK_ROW = (
  <g key="back-row">
    <Cable lead={CABLES.signal} />
    <Solid paths={BATTERY_ART.pack} tone="hi" crease="lo" />
    <Line d={BATTERY_ART.label} tone="lo" free />
    <Solid paths={BATTERY_ART.strap} tone="mid" crease="none" />
    <Solid paths={BATTERY_ART.balance} tone="mid" crease="none" />
    <Solid paths={TESTER_ART.case} tone="mid" crease="faint" />
    <Line d={TESTER_ART.ledRings} tone="lo" />
    <Line d={TESTER_ART.rule} tone="lo" free />
    <Line d={TESTER_ART.dial} tone="lo" />
    <Line d={TESTER_ART.scale} tone="mid" />
    <Solid paths={TESTER_ART.neck} tone="mid" crease="none" />
    <Solid paths={TESTER_ART.knob} tone="hi" crease="lo" />
    <Line d={TESTER_ART.knurl} tone="lo" />
  </g>
);

const LEVER_BEHIND = (
  <g key="lever-behind">
    <Solid
      paths={LEVER_BACK.riser}
      tone="mid"
      crease="faint"
      inner={<Line d={LEVER_BACK.riserSeam} tone="faint" />}
    />
    <Dots points={LEVER_BACK.riserScrews} size={0.45} tone="mid" />
    <Solid paths={LEVER_BACK.far.block} tone="mid" crease="faint" />
    <Dots points={LEVER_BACK.far.screws} size={0.45} tone="mid" />
    <Solid paths={LEVER_BACK.shaft} tone="hi" crease="none" />
    <Solid paths={CELL_ART.pedestal} tone="mid" crease="faint" />
    <Solid paths={CELL_ART.bar} tone="hi" crease="lo" />
    <Line d={CELL_ART.hole} tone="lo" />
    <Line d={CELL_ART.gauges} tone="lo" />
    <Dots points={CELL_ART.bolts} size={0.5} tone="mid" />
  </g>
);

const LEVER_ART = (
  <g key="lever">
    <Solid paths={LEVER.arm} tone="hi" crease="lo" />
    <Line d={LEVER.armLine} tone="faint" />
    <Solid paths={LEVER.button} tone="mid" crease="none" />
    <Solid paths={LEVER.foot} tone="hi" crease="lo" />
    <Solid paths={LEVER.near.block} tone="mid" crease="faint" />
    <Line d={LEVER.near.bore} tone="lo" />
    <Dots points={LEVER.near.screws} size={0.45} tone="mid" />
  </g>
);

const FRONT_LEFT = (
  <g key="front-left">
    <Cable lead={CABLES.pack} />
    <Cable lead={CABLES.meter} />
    <Solid paths={ESC_ART.case} tone="hi" crease="lo" />
    <Line d={ESC_ART.fins} tone="lo" />
    <Solid paths={METER_ART.case} tone="mid" crease="faint" />
    <Line d={METER_ART.rule} tone="lo" free />
    <Line d={METER_ART.window} tone="mid" />
  </g>
);

const MOTOR = (
  <g key="motor">
    <Cable lead={CABLES.motor} />
    <Solid paths={MOTOR_ART.mount} tone="mid" crease="faint" />
    <Dots points={MOTOR_ART.mountScrews} size={0.5} tone="mid" />
    <Solid paths={MOTOR_ART.stator} tone="mid" crease="none" />
    <Solid
      paths={MOTOR_ART.can}
      tone="hi"
      crease="none"
      inner={<Line d={MOTOR_ART.canSeam} tone="faint" />}
    />
    <Solid paths={MOTOR_ART.adapter} tone="mid" crease="none" />
  </g>
);

const HUB = (
  <g key="hub">
    <Solid paths={MOTOR_ART.hub} tone="hi" crease="none" />
    <Solid paths={MOTOR_ART.nut} tone="hi" crease="none" />
  </g>
);

const FRONT_RIGHT = (
  <g key="front-right">
    <Cable lead={CABLES.cell} />
    <Solid paths={DISPLAY_ART.case} tone="mid" crease="faint" />
    {DISPLAY_ART.buttons.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" crease="none" />
    ))}
    <Line d={DISPLAY_ART.rule} tone="lo" free />
    <Line d={DISPLAY_ART.window} tone="mid" />
  </g>
);

const LABEL = `A thrust stand on a bench. A 3S LiPo feeds a wattmeter, a speed controller and a 1000 KV motor on a lever that pivots on two bearings; the lever presses a load cell, and its display reads the thrust. A servo tester sets the throttle. At full throttle the ${PROP.inches} prop turns about ${Math.round(FULL.rpm / 100) * 100} rpm and pulls about ${Math.round(FULL.grams / 10) * 10} grams.`;

export function ThrustStandArt() {
  return (
    <ThrustStandLive
      label={LABEL}
      base={BASE}
      backRow={BACK_ROW}
      leverBehind={LEVER_BEHIND}
      lever={LEVER_ART}
      frontLeft={FRONT_LEFT}
      motor={MOTOR}
      hub={HUB}
      frontRight={FRONT_RIGHT}
      disc={PROP_DISC}
      text={{ amps: METER_ART.amps, watts: METER_ART.watts, grams: DISPLAY_ART.grams }}
    />
  );
}
