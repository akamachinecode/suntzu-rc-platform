import * as React from "react";
import type { SolidPaths } from "@/components/iso/iso-kit";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { Faded } from "../apart/faded";
import { ApartLive, type Slot } from "../apart/live";
import {
  BATTERY_ART,
  BLADES_ART,
  CANOPY_ART,
  ELECTRONICS_ART,
  FRAME_ART,
  HEAD_ART,
  MOTOR_ART,
  PART_COUNT,
  SERVO_FAR,
  SERVO_NEAR,
  SERVO_REAR,
  SKIDS_FAR,
  SKIDS_NEAR,
  SKID_CROSS,
  STAND_ART,
  SWASH_ART,
  TAIL_ART,
} from "./geometry";
import { HELI, STAGGER } from "./model";
import { HELI_SPEC } from "./spec";

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

function SkidSide({ side }: { side: typeof SKIDS_FAR }) {
  return (
    <>
      {side.struts.map((paths, index) => (
        <Round key={index} paths={paths} tone="mid" />
      ))}
      <Round paths={side.tube} tone="mid" />
      <Round paths={side.toe} tone="mid" />
      <Round paths={side.cap} tone="mid" />
    </>
  );
}

const TAIL = (
  <g key="tail">
    <Solid paths={TAIL_ART.fin} tone="hi" crease="lo" />
    <Solid paths={TAIL_ART.stab} tone="hi" crease="lo" />
    <Round paths={TAIL_ART.boom} tone="mid" />
    <Round paths={TAIL_ART.braceClamp} tone="mid" />
    <Round paths={TAIL_ART.stabClamp} tone="mid" />
    <Solid paths={TAIL_ART.gearbox} tone="mid" crease="faint" />
    {TAIL_ART.guides.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    <Solid paths={TAIL_ART.servo} tone="hi" crease="lo" />
    <Round paths={TAIL_ART.servoArm} />
    <Round paths={TAIL_ART.pushrod} tone="mid" />
    <Round paths={TAIL_ART.shaft} />
    <Round paths={TAIL_ART.slider} tone="mid" />
    <Round paths={TAIL_ART.hub} />
    {TAIL_ART.blades.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="lo" />
    ))}
  </g>
);

const GEAR = (
  <g key="gear">
    <Round paths={FRAME_ART.collar} tone="mid" />
    <Solid paths={FRAME_ART.gear} tone="mid" crease="none" />
    <Faded lines={FRAME_ART.gearTeeth} />
    <Round paths={FRAME_ART.hub} tone="mid" />
  </g>
);

const PINION = (
  <g key="pinion">
    <Round paths={MOTOR_ART.pinion} />
    <Faded lines={MOTOR_ART.pinionTeeth} />
  </g>
);

function SideServo({ servo }: { servo: typeof SERVO_FAR }) {
  return (
    <>
      <Solid paths={servo.tabs} tone="mid" crease="none" />
      <Solid paths={servo.body} tone="hi" crease="lo" />
      <Round paths={servo.spline} tone="mid" />
      <Round paths={servo.arm} />
      <Round paths={servo.ball} tone="mid" />
    </>
  );
}

const INSIDE = (
  <g key="inside">
    <Solid paths={FRAME_ART.servoTray} tone="mid" crease="faint" />
    <Round paths={FRAME_ART.shaft} />
    <Solid paths={FRAME_ART.boomClamp} tone="mid" crease="faint" />
    <Solid paths={FRAME_ART.tray} tone="mid" crease="faint" />
    <Solid paths={FRAME_ART.bearing} tone="mid" crease="faint" />
  </g>
);

const MOTOR = (
  <g key="motor">
    <Round paths={MOTOR_ART.shaft} />
    <Round paths={MOTOR_ART.can} />
    <Faded lines={MOTOR_ART.canVents} />
    <Solid paths={MOTOR_ART.mount} tone="mid" crease="faint" />
    <Dots points={MOTOR_ART.mountScrews} size={0.45} tone="mid" />
  </g>
);

const SERVO_BACK = (
  <g key="servo-rear">
    <Solid paths={SERVO_REAR.body} tone="hi" crease="lo" />
    <Round paths={SERVO_REAR.spline} tone="mid" />
    <Round paths={SERVO_REAR.arm} />
    <Round paths={SERVO_REAR.ball} tone="mid" />
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

const FRAME_NEAR = (
  <g key="frame-near">
    <Solid
      paths={FRAME_ART.plateNear}
      tone="mid"
      crease="faint"
      inner={<Line d={FRAME_ART.holes} tone="lo" />}
    />
    <Dots points={FRAME_ART.screws} size={0.5} tone="mid" />
  </g>
);

const ELECTRONICS = (
  <g key="electronics">
    <Solid paths={ELECTRONICS_ART.esc} tone="hi" crease="lo" />
    <Line d={ELECTRONICS_ART.escFins} tone="lo" />
    <Solid paths={ELECTRONICS_ART.rx} tone="hi" crease="lo" />
    <Dots points={ELECTRONICS_ART.rxLed} size={0.5} tone="hi" />
    <Solid paths={ELECTRONICS_ART.fbl} tone="hi" crease="lo" />
    <Dots points={ELECTRONICS_ART.fblLed} size={0.5} tone="hi" />
  </g>
);

const SWASH = (
  <g key="swash">
    {SWASH_ART.links.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    {SWASH_ART.linkEnds.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    {/* the far and rear balls sit behind the rings, the near one in front */}
    <Round paths={SWASH_ART.lowerBalls[1]!} tone="mid" />
    <Round paths={SWASH_ART.lowerBalls[2]!} tone="mid" />
    <Solid
      paths={SWASH_ART.lower}
      tone="hi"
      crease="none"
      inner={<Line d={SWASH_ART.seam} tone="faint" />}
    />
    <Round paths={SWASH_ART.lowerBalls[0]!} tone="mid" />
    <Round paths={SWASH_ART.upperBalls[1]!} tone="mid" />
    <Round paths={SWASH_ART.upper} />
    <Round paths={SWASH_ART.upperBalls[0]!} tone="mid" />
  </g>
);

function GripLower({ grip }: { grip: typeof HEAD_ART.far }) {
  return (
    <>
      <Solid paths={grip.lower} tone="hi" crease="lo" />
      <Solid paths={grip.arm} tone="mid" crease="none" />
      <Round paths={grip.armBall} tone="mid" />
    </>
  );
}

function GripUpper({ grip }: { grip: typeof HEAD_ART.far }) {
  return (
    <>
      <Solid paths={grip.upper} tone="hi" crease="lo" />
      <Line d={grip.boltRing} tone="lo" />
      <Dots points={[grip.bolt]} size={0.55} tone="mid" />
    </>
  );
}

function Blade({ blade }: { blade: typeof BLADES_ART.far }) {
  return (
    <>
      <Solid paths={blade.body} tone="hi" crease="lo" />
      <Line d={blade.tape} tone="lo" />
    </>
  );
}

const HUB = (
  <g key="hub">
    <Round paths={HEAD_ART.spindle} tone="mid" />
    <Solid paths={HEAD_ART.hub} tone="hi" crease="lo" />
    <Round paths={HEAD_ART.button} tone="mid" />
  </g>
);

const CANOPY = (
  <g key="canopy">
    <Solid
      paths={CANOPY_ART.shell}
      tone="hi"
      crease="none"
      inner={<Line d={CANOPY_ART.seams} tone="faint" />}
    />
    <Dots points={CANOPY_ART.grommets} size={0.6} tone="mid" />
  </g>
);

/** Painter's order, back to front. Each slot moves with its assembly; the stand and frame stay. */
export const SLOTS: Slot[] = [
  { key: "stand", node: STAND },
  { key: "skids-far", asm: "skids", node: <SkidSide key="skids-far" side={SKIDS_FAR} /> },
  {
    key: "brace-far",
    asm: "tail",
    node: <Round key="brace-far" paths={TAIL_ART.braceFar} tone="mid" />,
  },
  { key: "tail", asm: "tail", node: TAIL },
  { key: "gear", node: GEAR },
  { key: "pinion", asm: "motor", node: PINION },
  {
    key: "skid-cross",
    asm: "skids",
    node: (
      <React.Fragment key="skid-cross">
        {SKID_CROSS.map((paths, index) => (
          <Round key={index} paths={paths} tone="mid" />
        ))}
      </React.Fragment>
    ),
  },
  { key: "servo-far", asm: "servos", node: <SideServo key="servo-far" servo={SERVO_FAR} /> },
  {
    key: "frame-far",
    node: <Solid key="frame-far" paths={FRAME_ART.plateFar} tone="mid" crease="faint" />,
  },
  { key: "inside", node: INSIDE },
  { key: "motor", asm: "motor", node: MOTOR },
  { key: "servo-rear", asm: "servos", node: SERVO_BACK },
  { key: "battery", asm: "battery", node: BATTERY },
  { key: "frame-near", node: FRAME_NEAR },
  { key: "electronics", asm: "electronics", node: ELECTRONICS },
  {
    key: "brace-near",
    asm: "tail",
    node: <Round key="brace-near" paths={TAIL_ART.braceNear} tone="mid" />,
  },
  { key: "skids-near", asm: "skids", node: <SkidSide key="skids-near" side={SKIDS_NEAR} /> },
  { key: "servo-near", asm: "servos", node: <SideServo key="servo-near" servo={SERVO_NEAR} /> },
  { key: "swash", asm: "swash", node: SWASH },
  {
    key: "link-far",
    asm: "head",
    node: <Round key="link-far" paths={HEAD_ART.pitchLinks[1]!} tone="mid" />,
  },
  { key: "grip-far-low", asm: "head", node: <GripLower key="grip-far-low" grip={HEAD_ART.far} /> },
  { key: "blade-far", asm: "blades", node: <Blade key="blade-far" blade={BLADES_ART.far} /> },
  { key: "grip-far-up", asm: "head", node: <GripUpper key="grip-far-up" grip={HEAD_ART.far} /> },
  { key: "hub", asm: "head", node: HUB },
  {
    key: "link-near",
    asm: "head",
    node: <Round key="link-near" paths={HEAD_ART.pitchLinks[0]!} tone="mid" />,
  },
  {
    key: "grip-near-low",
    asm: "head",
    node: <GripLower key="grip-near-low" grip={HEAD_ART.near} />,
  },
  { key: "blade-near", asm: "blades", node: <Blade key="blade-near" blade={BLADES_ART.near} /> },
  {
    key: "grip-near-up",
    asm: "head",
    node: <GripUpper key="grip-near-up" grip={HEAD_ART.near} />,
  },
  { key: "canopy", asm: "canopy", node: CANOPY },
];

const LABEL = `A ${HELI.rotor} mm 450-class electric helicopter on a display post, built from ${PART_COUNT} parts, its blades folded back. As you scroll it comes apart into ${STAGGER.length} assemblies in the order you would strip it: blades, rotor head, swashplate, canopy, battery, servos, electronics, motor, tail and skids.`;

export function HeliApartArt() {
  return <ApartLive label={LABEL} slots={SLOTS} parts={PART_COUNT} spec={HELI_SPEC} />;
}
