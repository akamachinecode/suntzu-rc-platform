import * as React from "react";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import * as G from "@/components/iso/lathe.mjs";
import { BENCH, SERVOS_BACK, SERVOS_FRONT, type ServoArt } from "./geometry";
import { SwashplateLive } from "./live";
import { HUB_Z, P } from "./view";

const BENCH_ART = (
  <g key="bench">
    <path className="iso-halo" d={BENCH.halo} />
    {BENCH.feet.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
    <Solid paths={BENCH.base} tone="mid" crease="faint" />
    <Line d={BENCH.groove} tone="lo" />
    <Line d={BENCH.screwRings} tone="lo" />
    <Dots points={BENCH.screws} size={0.5} tone="mid" />
    <Solid paths={BENCH.label} tone="lo" crease="none" />
    <Line d={BENCH.labelLine} tone="faint" />
    <Line d={BENCH.labelRule} tone="lo" free />
    <Solid paths={BENCH.bearing} tone="mid" crease="faint" />
    <Line d={BENCH.bearingRing} tone="lo" />
    <Solid paths={BENCH.collar} tone="mid" crease="none" />
    <Solid paths={BENCH.shaft} tone="hi" crease="none" />
  </g>
);

function Servo({ servo }: { servo: ServoArt }) {
  return (
    <>
      <Solid paths={servo.pad} tone="lo" crease="faint" />
      <Solid paths={servo.body} tone="hi" crease="lo" />
      <Solid paths={servo.ears} tone="mid" crease="faint" />
      <Dots points={servo.screws} size={0.5} tone="mid" />
      <Line d={servo.label} tone="lo" free />
      <Solid paths={servo.spline} tone="mid" crease="none" />
    </>
  );
}

const POST_ART = (
  <g key="post">
    <Solid paths={BENCH.postFoot} tone="mid" crease="none" />
    <Solid paths={BENCH.cheeks[0]!} tone="mid" crease="faint" />
    <Solid paths={BENCH.post} tone="mid" crease="none" />
    <Solid paths={BENCH.cheeks[1]!} tone="mid" crease="faint" />
  </g>
);

const BUTTON = (
  <Solid
    key="button"
    paths={G.disc(HUB_Z + 8, HUB_Z + 11, 4.5, G.frameAlong([0, 0, 0], [0, 0, 1]), P)}
    tone="mid"
    crease="none"
  />
);

const LABEL =
  "A rotor-head bench. A main shaft stands in a bearing block with three servos round it, 120 degrees apart, each pushing a link up to the bottom ring of the swashplate. The top ring turns with the head and pushes two pitch links up to the blade grips. Raise the plate and both blades gain pitch; tilt it and each blade's pitch rises and falls once per turn.";

export function SwashplateArt() {
  return (
    <SwashplateLive
      label={LABEL}
      bench={BENCH_ART}
      back={SERVOS_BACK.map((servo) => (
        <React.Fragment key={servo.angle}>
          <Servo servo={servo} />
        </React.Fragment>
      ))}
      backAngles={SERVOS_BACK.map((servo) => servo.angle)}
      post={POST_ART}
      button={BUTTON}
      front={SERVOS_FRONT.map((servo) => (
        <React.Fragment key={servo.angle}>
          <Servo servo={servo} />
        </React.Fragment>
      ))}
      frontAngles={SERVOS_FRONT.map((servo) => servo.angle)}
    />
  );
}
