import * as React from "react";
import type { SolidPaths } from "@/components/iso/iso-kit";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { Faded } from "../apart/faded";
import { ApartLive, type Slot } from "../apart/live";
import {
  BATTERY_ART,
  BODY_ART,
  CHASSIS_ART,
  CORNERS,
  DRIVE_ART,
  ELECTRONICS_ART,
  MOTOR_ART,
  PART_COUNT,
  SHOCKS,
  STAND_ART,
  STEERING_ART,
  WHEELS,
} from "./geometry";
import { STAGGER, TRUCK } from "./model";
import { CAR_SPEC } from "./spec";

const Round = ({ paths, tone = "hi" }: { paths: SolidPaths; tone?: "hi" | "mid" | "lo" }) => (
  <Solid paths={paths} tone={tone} crease="none" />
);

const STAND = (
  <g key="stand">
    <path className="iso-halo" d={STAND_ART.halo} />
    {STAND_ART.feet.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid paths={STAND_ART.base} tone="mid" crease="faint" />
    <Line d={STAND_ART.groove} tone="lo" />
    <Line d={STAND_ART.screwRings} tone="lo" />
    <Dots points={STAND_ART.screws} size={0.5} tone="mid" />
    <Solid paths={STAND_ART.label} tone="lo" crease="none" />
    <Line d={STAND_ART.labelLine} tone="faint" />
    <Line d={STAND_ART.labelRule} tone="lo" free />
    <Solid paths={STAND_ART.collar} tone="mid" crease="faint" />
    <Solid paths={STAND_ART.post} tone="mid" crease="none" />
    <Solid paths={STAND_ART.yoke} tone="mid" crease="faint" />
  </g>
);

function Wheel({ wheel, rim }: { wheel: typeof WHEELS.rearFar; rim: boolean }) {
  return (
    <>
      <Round paths={wheel.tyre} />
      <Faded lines={wheel.tread} />
      {rim ? (
        <>
          <Solid
            paths={wheel.rim}
            tone="mid"
            crease="none"
            inner={<Line d={wheel.rimLip} tone="lo" />}
          />
          <Line d={wheel.spokes} tone="mid" />
          <Round paths={wheel.nut} tone="mid" />
        </>
      ) : null}
    </>
  );
}

function Corner({ corner }: { corner: typeof CORNERS.rearFar }) {
  return (
    <>
      <Solid paths={corner.arm} tone="mid" crease="faint" />
      <Dots points={corner.pins} size={0.45} tone="mid" />
      <Solid paths={corner.hub} tone="mid" crease="faint" />
    </>
  );
}

function Shock({ shock }: { shock: typeof SHOCKS.rearFar }) {
  return (
    <>
      <Round paths={shock.eyeLow} tone="mid" />
      <Line d={shock.spring.back} tone="mid" />
      <Round paths={shock.shaft} />
      <Round paths={shock.body} />
      <Round paths={shock.cupLow} tone="mid" />
      <Line d={shock.spring.front} tone="hi" />
      <Round paths={shock.cupHigh} tone="mid" />
      <Round paths={shock.eyeHigh} tone="mid" />
    </>
  );
}

const CHASSIS = (
  <g key="chassis">
    <Solid paths={CHASSIS_ART.bumperRear} tone="mid" crease="faint" />
    <Solid paths={CHASSIS_ART.floor} tone="mid" crease="faint" />
    <Dots points={CHASSIS_ART.floorScrews} size={0.45} tone="mid" />
    <Solid paths={CHASSIS_ART.railFar} tone="mid" crease="none" />
    <Solid paths={CHASSIS_ART.bulkRear} tone="mid" crease="faint" />
    <Solid paths={CHASSIS_ART.towerRear} tone="mid" crease="faint" />
    <Solid paths={CHASSIS_ART.bulkFront} tone="mid" crease="faint" />
    <Solid paths={CHASSIS_ART.bumperFront} tone="mid" crease="faint" />
  </g>
);

const CASE = (
  <g key="case">
    <Round paths={DRIVE_ART.cupFar} tone="mid" />
    <Solid
      paths={DRIVE_ART.case}
      tone="hi"
      crease="lo"
      inner={<Line d={DRIVE_ART.caseSeam} tone="faint" />}
    />
  </g>
);

const MOTOR = (
  <g key="motor">
    <Round paths={MOTOR_ART.bell} tone="mid" />
    <Round paths={MOTOR_ART.can} />
    <Faded lines={MOTOR_ART.vents} />
  </g>
);

const SPUR = (
  <g key="spur">
    <Round paths={DRIVE_ART.cupNear} tone="mid" />
    <Round paths={DRIVE_ART.spur} />
    <Faded lines={DRIVE_ART.spurTeeth} />
    <Round paths={DRIVE_ART.slipper} tone="mid" />
  </g>
);

const BATTERY = (
  <g key="battery">
    <Solid paths={BATTERY_ART.plug} tone="mid" crease="faint" />
    <Solid paths={BATTERY_ART.pack} tone="hi" crease="lo" />
    <Line d={BATTERY_ART.label} tone="lo" free />
    <Solid paths={BATTERY_ART.strap} tone="mid" crease="none" />
  </g>
);

const STEERING = (
  <g key="steering">
    <Round paths={STEERING_ART.links[0]!} tone="mid" />
    <Solid paths={STEERING_ART.servo} tone="hi" crease="lo" />
    <Round paths={STEERING_ART.saver} tone="mid" />
    <Round paths={STEERING_ART.links[1]!} tone="mid" />
  </g>
);

const FRONT_TOWER = (
  <g key="tower-front">
    <Solid paths={CHASSIS_ART.towerFront} tone="mid" crease="faint" />
    <Dots points={CHASSIS_ART.towerBolts} size={0.55} tone="mid" />
  </g>
);

const ELECTRONICS = (
  <g key="electronics">
    <Solid paths={ELECTRONICS_ART.esc} tone="hi" crease="lo" />
    <Line d={ELECTRONICS_ART.fan} tone="lo" />
    <Dots points={ELECTRONICS_ART.fanHub} size={0.5} tone="mid" />
    <Solid
      paths={ELECTRONICS_ART.rx}
      tone="hi"
      crease="lo"
      inner={<Line d={ELECTRONICS_ART.rxSeam} tone="faint" />}
    />
    <Round paths={ELECTRONICS_ART.antenna} tone="mid" />
    <Round paths={ELECTRONICS_ART.antennaCap} tone="mid" />
  </g>
);

const BODY = (
  <g key="body">
    <Solid
      paths={BODY_ART.lower}
      tone="hi"
      crease="lo"
      inner={
        <>
          <Line d={BODY_ART.arches} tone="lo" />
          <Line d={BODY_ART.number} tone="lo" />
          <Line d={BODY_ART.stripes} tone="lo" />
          <Line d={BODY_ART.grille} tone="lo" />
          <Line d={BODY_ART.hood} tone="faint" />
          <Line d={BODY_ART.bed} tone="lo" />
        </>
      }
    />
    <Dots points={BODY_ART.clips} size={0.6} tone="mid" />
    <Solid
      paths={BODY_ART.cab}
      tone="hi"
      crease="lo"
      inner={
        <>
          <Line d={BODY_ART.window} tone="lo" />
          <Line d={BODY_ART.windscreen} tone="lo" />
        </>
      }
    />
  </g>
);

/** Painter's order, back to front. Each slot moves with its assembly; the stand and chassis stay. */
export const SLOTS: Slot[] = [
  { key: "stand", node: STAND },
  {
    key: "wheel-rear-far",
    asm: "right-wheels",
    node: <Wheel key="wrf" wheel={WHEELS.rearFar} rim={false} />,
  },
  {
    key: "wheel-front-far",
    asm: "right-wheels",
    node: <Wheel key="wff" wheel={WHEELS.frontFar} rim={false} />,
  },
  {
    key: "corner-rear-far",
    asm: "suspension",
    node: <Corner key="crf" corner={CORNERS.rearFar} />,
  },
  {
    key: "corner-front-far",
    asm: "suspension",
    node: <Corner key="cff" corner={CORNERS.frontFar} />,
  },
  { key: "shock-rear-far", asm: "shocks", node: <Shock key="srf" shock={SHOCKS.rearFar} /> },
  { key: "shock-front-far", asm: "shocks", node: <Shock key="sff" shock={SHOCKS.frontFar} /> },
  {
    key: "bone-far",
    asm: "drivetrain",
    node: <Round key="bone-far" paths={DRIVE_ART.boneFar} tone="mid" />,
  },
  { key: "chassis", node: CHASSIS },
  { key: "case", asm: "drivetrain", node: CASE },
  { key: "motor", asm: "motor", node: MOTOR },
  { key: "spur", asm: "drivetrain", node: SPUR },
  {
    key: "pinion",
    asm: "motor",
    node: <Solid key="pinion" paths={MOTOR_ART.pinion} tone="hi" crease="none" />,
  },
  { key: "battery", asm: "battery", node: BATTERY },
  { key: "steering", asm: "steering", node: STEERING },
  { key: "tower-front", node: FRONT_TOWER },
  { key: "electronics", asm: "electronics", node: ELECTRONICS },
  {
    key: "rail-near",
    node: <Solid key="rail-near" paths={CHASSIS_ART.railNear} tone="mid" crease="none" />,
  },
  {
    key: "bone-near",
    asm: "drivetrain",
    node: <Round key="bone-near" paths={DRIVE_ART.boneNear} tone="mid" />,
  },
  {
    key: "corner-rear-near",
    asm: "suspension",
    node: <Corner key="crn" corner={CORNERS.rearNear} />,
  },
  {
    key: "corner-front-near",
    asm: "suspension",
    node: <Corner key="cfn" corner={CORNERS.frontNear} />,
  },
  { key: "shock-rear-near", asm: "shocks", node: <Shock key="srn" shock={SHOCKS.rearNear} /> },
  { key: "shock-front-near", asm: "shocks", node: <Shock key="sfn" shock={SHOCKS.frontNear} /> },
  {
    key: "wheel-rear-near",
    asm: "left-wheels",
    node: <Wheel key="wrn" wheel={WHEELS.rearNear} rim />,
  },
  {
    key: "wheel-front-near",
    asm: "left-wheels",
    node: <Wheel key="wfn" wheel={WHEELS.frontNear} rim />,
  },
  { key: "body", asm: "body", node: BODY },
];

const LABEL = `A 1/10 short-course truck on a display post, ${TRUCK.length} mm long, built from ${PART_COUNT} parts. As you scroll it comes apart into ${STAGGER.length} assemblies in the order you would strip it: body, wheels, shocks, battery, speed control and receiver, steering, motor, transmission and suspension arms.`;

export function CarApartArt() {
  return <ApartLive label={LABEL} slots={SLOTS} parts={PART_COUNT} spec={CAR_SPEC} />;
}
