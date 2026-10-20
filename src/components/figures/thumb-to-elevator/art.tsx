import * as React from "react";
import { pathOf } from "@/components/iso/iso-kit";
import { Dots, FaceText, Line, Solid, Wire } from "@/components/iso/react/draw";
import {
  BASE_ART,
  BLOCK_ART,
  CLAMP_HIGH,
  CLAMP_LOW,
  GIMBAL_ART,
  LEADS,
  POST_ART,
  RX_ART,
  SERVO_ART,
  STAB_ART,
} from "./geometry";
import { ThumbToElevatorLive } from "./live";
import { MAX_ELEVATOR, PUSHROD } from "./model";

const BASE = (
  <g key="base">
    <path className="iso-halo" d={BASE_ART.halo} />
    {BASE_ART.feet.map((parts, index) => (
      <g key={index}>
        {parts.map((paths, part) => (
          <Solid key={part} paths={paths} tone={part ? "mid" : "lo"} crease="faint" />
        ))}
      </g>
    ))}
    <Solid paths={BASE_ART.slab} tone="mid" crease="faint" />
    <Line d={BASE_ART.groove} tone="lo" />
    <Line d={BASE_ART.screwRings} tone="lo" />
    <Dots points={BASE_ART.screws} size={0.55} tone="mid" />
    <Solid paths={BASE_ART.strip} tone="lo" crease="none" />
    <Line d={BASE_ART.stripMinor} tone="lo" />
    <Line d={BASE_ART.stripMajor} tone="mid" />
    <Solid paths={BASE_ART.label} tone="lo" crease="none" />
    <Line d={BASE_ART.labelLine} tone="faint" />
    <Line d={BASE_ART.labelRule} tone="lo" free />
    <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
  </g>
);

const CLAMP_BELOW = (
  <g key="clamp-below">
    <Solid paths={CLAMP_LOW.foot} tone="lo" crease="faint" />
    <Dots points={CLAMP_LOW.footScrews} size={0.45} tone="mid" />
    <Solid
      paths={CLAMP_LOW.tower}
      tone="mid"
      crease="faint"
      inner={<Line d={CLAMP_LOW.towerSeam} tone="faint" />}
    />
    <Solid paths={CLAMP_LOW.jaw} tone="mid" crease="faint" />
    <Solid paths={CLAMP_LOW.spacer} tone="mid" crease="faint" />
  </g>
);

const LEAD_WIRES = (
  <g key="leads">
    <Wire
      from={LEADS.antennaA[0]!}
      via={[LEADS.antennaA[1]!]}
      to={LEADS.antennaA[2]!}
      tone="mid"
      ends="to"
    />
    <Wire
      from={LEADS.antennaB[0]!}
      via={[LEADS.antennaB[1]!]}
      to={LEADS.antennaB[2]!}
      tone="mid"
      ends="to"
    />
  </g>
);

const GIMBAL_BODY = (
  <g key="gimbal">
    <Solid
      paths={GIMBAL_ART.housing}
      tone="mid"
      crease="faint"
      inner={<Line d={GIMBAL_ART.housingSeam} tone="faint" />}
    />
    <Solid paths={GIMBAL_ART.panel} tone="mid" crease="faint" />
    <Dots points={GIMBAL_ART.panelScrews} size={0.45} tone="mid" />
    <path className="iso-line tte-void" d={GIMBAL_ART.slot} />
    <Line d={GIMBAL_ART.slot} tone="mid" />
    <Line d={GIMBAL_ART.slotInner} tone="faint" />
    <Solid paths={GIMBAL_ART.scale} tone="lo" crease="none" />
    <Line d={GIMBAL_ART.scaleMinor} tone="lo" />
    <Line d={GIMBAL_ART.scaleMajor} tone="hi" />
    <Line d={GIMBAL_ART.switchRing} tone="lo" />
    <Solid paths={GIMBAL_ART.switchLever} tone="mid" crease="none" />
    <Solid paths={GIMBAL_ART.switchTip} tone="mid" crease="faint" />
    <Solid paths={GIMBAL_ART.antennaBase} tone="mid" crease="faint" />
    <Line d={GIMBAL_ART.antennaKnurl} tone="lo" />
    <Solid
      paths={GIMBAL_ART.whip}
      tone="mid"
      crease="none"
      inner={<Line d={GIMBAL_ART.whipSeam} tone="faint" />}
    />
    <Solid paths={GIMBAL_ART.tip} tone="mid" crease="none" />
  </g>
);

const RECEIVER = (
  <g key="receiver">
    <Solid paths={RX_ART.pad} tone="lo" crease="none" />
    <Solid
      paths={RX_ART.case}
      tone="mid"
      crease="faint"
      inner={<Line d={RX_ART.caseSeam} tone="faint" />}
    />
    <Line d={RX_ART.label} tone="faint" />
    <Line d={RX_ART.labelRule} tone="lo" free />
    <Line d={RX_ART.bindRing} tone="lo" />
    <Solid paths={RX_ART.bind} tone="mid" crease="none" />
    <Line d={RX_ART.ledRing} tone="lo" />
    <Dots points={RX_ART.led} size={0.9} tone="hi" pulse />
    <Solid
      paths={RX_ART.plug}
      tone="mid"
      crease="faint"
      inner={<Line d={RX_ART.plugSeam} tone="faint" />}
    />
  </g>
);

const MOUNTS = (
  <g key="mounts">
    {BLOCK_ART.map((block, index) => (
      <g key={index}>
        <Solid paths={block.foot} tone="lo" crease="faint" />
        <Dots points={block.footScrews} size={0.45} tone="mid" />
        <Solid paths={block.block} tone="mid" crease="faint" />
        <Dots points={block.topScrew} size={0.5} tone="mid" />
      </g>
    ))}
  </g>
);

const LEAD_PATH = pathOf(LEADS.servo);
const PLUG_END = LEADS.servo.at(-1)!;

/** The servo lead is a real cable, so it is drawn with a body and a core rather than as a hairline. */
const SERVO_LEAD = (
  <g key="servo-lead" className="tte-cable">
    <path className="tte-cable-body" d={LEAD_PATH} />
    <path className="tte-cable-core" d={LEAD_PATH} />
    <circle className="iso-wire-end" cx={PLUG_END[0]} cy={PLUG_END[1]} r={1.3} />
  </g>
);

const SERVO = (
  <g key="servo">
    {SERVO_ART.tabs.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" crease="faint" />
    ))}
    {SERVO_ART.grommets.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="none" />
    ))}
    <Line d={SERVO_ART.eyelets} tone="mid" />
    <Dots points={SERVO_ART.screws} size={0.5} tone="hi" />
    <Solid
      paths={SERVO_ART.case}
      tone="hi"
      crease="lo"
      inner={<Line d={SERVO_ART.seams} tone="faint" />}
    />
    <FaceText transform={SERVO_ART.label} size={4.2} tone="lo" anchor="middle">
      servo
    </FaceText>
    <Solid paths={SERVO_ART.boss} tone="mid" crease="none" />
    <Line d={SERVO_ART.splineRing} tone="faint" />
    <Solid paths={SERVO_ART.spline} tone="mid" crease="none" />
  </g>
);

const STAB = (
  <g key="stab">
    <Solid
      paths={STAB_ART.plate}
      tone="mid"
      crease="faint"
      inner={
        <>
          <Line d={STAB_ART.spar} tone="faint" />
          <Line d={STAB_ART.hinges} tone="lo" />
        </>
      }
    />
  </g>
);

const CLAMP_ABOVE = (
  <g key="clamp-above">
    <Solid paths={CLAMP_HIGH.jaw} tone="mid" crease="faint" />
    <Dots points={CLAMP_HIGH.jawScrews} size={0.45} tone="mid" />
    <Solid paths={CLAMP_HIGH.neck} tone="mid" crease="none" />
    <Solid paths={CLAMP_HIGH.knob} tone="mid" crease="faint" />
    <Line d={CLAMP_HIGH.knobKnurl} tone="lo" />
    <Line d={CLAMP_HIGH.knobRing} tone="faint" />
    <Dots points={CLAMP_HIGH.knobDot} size={0.5} tone="mid" />
  </g>
);

const RULER = (
  <g key="ruler">
    <Solid paths={POST_ART.foot} tone="lo" crease="faint" />
    <Dots points={POST_ART.footScrews} size={0.45} tone="mid" />
    <Solid paths={POST_ART.post} tone="mid" crease="faint" />
    <Solid paths={POST_ART.cap} tone="mid" crease="faint" />
    <Line d={POST_ART.minor} tone="lo" />
    <Line d={POST_ART.major} tone="mid" />
    <Line d={POST_ART.zero} tone="hi" />
  </g>
);

const LABEL = `A test bench that follows one command from thumb to tail. On the left a transmitter gimbal with its stick in a slot over a scale. In the middle a receiver on a foam pad with its two antennas and a lead to a standard servo, which lies on its side between two mounting posts. Its arm drives a ${PUSHROD} millimetre pushrod to a control horn under the elevator of a clamped tail section. A ruler post beside the trailing edge reads the throw. Full stick moves the elevator about ${MAX_ELEVATOR.toFixed(0)} degrees.`;

export function ThumbToElevatorArt() {
  return (
    <ThumbToElevatorLive
      label={LABEL}
      base={BASE}
      clampBelow={CLAMP_BELOW}
      leads={LEAD_WIRES}
      gimbal={GIMBAL_BODY}
      receiver={RECEIVER}
      mounts={MOUNTS}
      servoLead={SERVO_LEAD}
      servo={SERVO}
      stab={STAB}
      clampAbove={CLAMP_ABOVE}
      ruler={RULER}
    />
  );
}
