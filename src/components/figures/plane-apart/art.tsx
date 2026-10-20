import * as React from "react";
import type { Flat } from "@/components/iso/iso-kit";
import { Dots, Line, Solid } from "@/components/iso/react/draw";
import {
  BATTERY_ART,
  FIN_ART,
  FUSELAGE_BACK,
  FUSELAGE_FRONT,
  GEAR_FAR,
  GEAR_NEAR,
  HATCH_ART,
  MOTOR_ART,
  NOSE_GEAR,
  PART_COUNT,
  PROP_ART,
  RADIO_ART,
  STAB_FAR,
  STAB_NEAR,
  STAND_ART,
  WING_FAR,
  WING_NEAR,
} from "./geometry";
import { PlaneApartLive, type Slot } from "./live";
import { STAGGER, TRAINER } from "./model";

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
    <Solid paths={STAND_ART.clamp} tone="mid" crease="faint" />
    <Solid paths={STAND_ART.knob} tone="mid" crease="none" />
    <Solid paths={STAND_ART.yoke} tone="mid" crease="faint" />
    {STAND_ART.pads.map((paths, index) => (
      <Solid key={index} paths={paths} tone="lo" crease="faint" />
    ))}
  </g>
);

function MainGear({ gear }: { gear: typeof GEAR_FAR }) {
  return (
    <>
      <Solid paths={gear.leg} tone="hi" crease="none" />
      <Solid paths={gear.axle} tone="hi" crease="none" />
      <Solid paths={gear.wheel.tyre} tone="hi" crease="none" />
      <Solid paths={gear.wheel.hub} tone="mid" crease="none" />
      <Line d={gear.wheel.hubRing} tone="lo" />
      <Solid paths={gear.wheel.collar} tone="mid" crease="none" />
    </>
  );
}

const GEAR_BACK = (
  <g key="gear-back">
    <MainGear gear={GEAR_FAR} />
    <Solid paths={NOSE_GEAR.block} tone="mid" crease="faint" />
    <Solid paths={NOSE_GEAR.leg} tone="hi" crease="none" />
    <Solid paths={NOSE_GEAR.coil} tone="mid" crease="none" />
    <Solid paths={NOSE_GEAR.fork} tone="hi" crease="none" />
    <Solid paths={NOSE_GEAR.wheel.tyre} tone="hi" crease="none" />
    <Solid paths={NOSE_GEAR.wheel.hub} tone="mid" crease="none" />
    <Line d={NOSE_GEAR.wheel.hubRing} tone="lo" />
    <Solid paths={NOSE_GEAR.wheel.collar} tone="mid" crease="none" />
  </g>
);

const FUSELAGE_INSIDE = (
  <g key="fuselage-back">
    <Solid paths={FUSELAGE_BACK.farWall} tone="mid" crease="faint" />
    <Solid paths={FUSELAGE_BACK.floor} tone="lo" crease="none" />
    <Solid paths={FUSELAGE_BACK.former} tone="mid" crease="faint" />
    <Line d={FUSELAGE_BACK.formerHole} tone="lo" />
  </g>
);

const RADIO = (
  <g key="radio">
    {RADIO_ART.antennas.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="none" />
    ))}
    <Solid paths={RADIO_ART.rx} tone="hi" crease="lo" />
    <Line d={RADIO_ART.rxLabel} tone="faint" />
    <Dots points={RADIO_ART.rxLed} size={0.6} tone="hi" />
    <Solid paths={RADIO_ART.esc} tone="hi" crease="lo" />
    <Line d={RADIO_ART.escFins} tone="lo" />
    {RADIO_ART.servos.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="lo" />
    ))}
    {RADIO_ART.splines.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" crease="none" />
    ))}
    {RADIO_ART.arms.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="none" />
    ))}
  </g>
);

const BATTERY = (
  <g key="battery">
    <Solid paths={BATTERY_ART.pack} tone="hi" crease="lo" />
    <Line d={BATTERY_ART.label} tone="lo" free />
    <Solid paths={BATTERY_ART.strap} tone="mid" crease="none" />
    <Solid paths={BATTERY_ART.plug} tone="mid" crease="faint" />
  </g>
);

const FUSELAGE_OUTSIDE = (
  <g key="fuselage-front">
    <Solid
      paths={FUSELAGE_FRONT.nearWall}
      tone="mid"
      crease="faint"
      inner={<Line d={FUSELAGE_FRONT.window} tone="faint" />}
    />
    <Solid paths={FUSELAGE_FRONT.rearDeck} tone="mid" crease="faint" />
    <Solid paths={FUSELAGE_FRONT.frontDeck} tone="mid" crease="faint" />
    <Solid paths={FUSELAGE_FRONT.firewallTop} tone="mid" crease="faint" />
    <Solid paths={FUSELAGE_FRONT.firewall} tone="mid" crease="faint" />
    <Solid paths={FUSELAGE_FRONT.tailPost} tone="mid" crease="none" />
  </g>
);

const HATCH = (
  <g key="hatch">
    <Solid paths={HATCH_ART.plate} tone="hi" crease="lo" />
    <Solid paths={HATCH_ART.canopy} tone="hi" crease="lo" />
    <Solid paths={HATCH_ART.grip} tone="mid" crease="none" />
    <Dots points={HATCH_ART.magnets} size={0.6} tone="mid" />
  </g>
);

function Stab({ half }: { half: typeof STAB_FAR & { horn?: typeof STAB_NEAR.horn } }) {
  return (
    <>
      <Solid paths={half.stab} tone="hi" crease="lo" />
      <Solid paths={half.elevator} tone="hi" crease="lo" />
      {half.horn ? <Solid paths={half.horn} tone="mid" crease="none" /> : null}
    </>
  );
}

const FIN = (
  <g key="fin">
    <Solid paths={FIN_ART.root} tone="mid" crease="none" />
    <Solid paths={FIN_ART.fin} tone="hi" crease="lo" />
    <Solid paths={FIN_ART.rudder} tone="hi" crease="lo" />
    <Solid paths={FIN_ART.horn} tone="mid" crease="none" />
  </g>
);

function WingHalf({ half }: { half: typeof WING_FAR }) {
  return (
    <>
      <Solid
        paths={half.panel}
        tone="hi"
        crease="lo"
        inner={
          <>
            <Line d={half.spar} tone="faint" />
            <Line d={half.tape} tone="faint" />
          </>
        }
      />
      <Solid paths={half.flap} tone="hi" crease="lo" />
      <Solid paths={half.aileron} tone="hi" crease="lo" />
      <Dots points={half.bolts as Flat[]} size={0.7} tone="mid" />
    </>
  );
}

const MOTOR = (
  <g key="motor">
    <Solid paths={MOTOR_ART.mount} tone="mid" crease="faint" />
    <Dots points={MOTOR_ART.mountScrews} size={0.5} tone="mid" />
    <Solid paths={MOTOR_ART.stator} tone="mid" crease="none" />
    <Solid
      paths={MOTOR_ART.can}
      tone="hi"
      crease="none"
      inner={<Line d={MOTOR_ART.canSeam} tone="faint" />}
    />
    <Solid paths={MOTOR_ART.shaft} tone="hi" crease="none" />
  </g>
);

const PROP = (
  <g key="prop">
    <Solid paths={PROP_ART.adapter} tone="mid" crease="none" />
    <Solid paths={PROP_ART.backplate} tone="mid" crease="none" />
    {PROP_ART.blades.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="lo" />
    ))}
    <Solid paths={PROP_ART.spinner} tone="hi" crease="none" />
  </g>
);

/** Painter's order, back to front. Each slot moves with its assembly; the stand and fuselage stay. */
const SLOTS: Slot[] = [
  { key: "stand", node: STAND },
  { key: "gear-back", asm: "gear", node: GEAR_BACK },
  { key: "fuselage-back", node: FUSELAGE_INSIDE },
  { key: "radio", asm: "radio", node: RADIO },
  { key: "battery", asm: "battery", node: BATTERY },
  { key: "fuselage-front", node: FUSELAGE_OUTSIDE },
  { key: "hatch", asm: "hatch", node: HATCH },
  { key: "stab-far", asm: "stab", node: <Stab key="stab-far" half={STAB_FAR} /> },
  { key: "fin", asm: "fin", node: FIN },
  { key: "stab-near", asm: "stab", node: <Stab key="stab-near" half={STAB_NEAR} /> },
  { key: "gear-near", asm: "gear", node: <MainGear key="gear-near" gear={GEAR_NEAR} /> },
  { key: "wing-far", asm: "wing", node: <WingHalf key="wing-far" half={WING_FAR} /> },
  { key: "wing-near", asm: "wing", node: <WingHalf key="wing-near" half={WING_NEAR} /> },
  { key: "motor", asm: "motor", node: MOTOR },
  { key: "prop", asm: "prop", node: PROP },
];

const LABEL = `A ${TRAINER.span / 1000} m electric trainer on a display stand, built from ${PART_COUNT} parts. As you scroll it comes apart into ${STAGGER.length} assemblies in the order you would take it apart: propeller, motor, hatch, wing, battery, radio gear, fin, stabiliser and landing gear.`;

export function PlaneApartArt() {
  return <PlaneApartLive label={LABEL} slots={SLOTS} parts={PART_COUNT} />;
}
