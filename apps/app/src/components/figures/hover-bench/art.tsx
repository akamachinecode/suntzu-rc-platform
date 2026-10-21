import { Dots, Line, Solid } from "@/components/iso/react/draw";
import type { SolidPaths } from "@/components/iso/iso-kit";
import { BENCH, BODY } from "./geometry";
import { HoverBenchLive } from "./live";
import { HEADSPEED, HOVER_PITCH, WEIGHT } from "./model";

const Round = ({ paths, tone = "hi" }: { paths: SolidPaths; tone?: "hi" | "mid" | "lo" }) => (
  <Solid paths={paths} tone={tone} crease="none" />
);

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
    <Solid paths={BENCH.cell} tone="mid" crease="faint" />
    <Solid paths={BENCH.platform} tone="mid" crease="faint" />
    <Line d={BENCH.platformGroove} tone="lo" />
    {BENCH.anchors.map((paths, index) => (
      <Solid key={index} paths={paths} tone="mid" crease="none" />
    ))}
  </g>
);

const BODY_BACK = (
  <g key="body-back">
    {BODY.skidFar.struts.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    <Round paths={BODY.skidFar.tube} tone="mid" />
    <Round paths={BODY.skidFar.toe} tone="mid" />
  </g>
);

const BODY_MID = (
  <g key="body-mid">
    <Round paths={BODY.brace[0]!} tone="mid" />
    <Solid paths={BODY.fin} tone="hi" crease="lo" />
    <Round paths={BODY.boom} tone="mid" />
    <Solid paths={BODY.gearbox} tone="mid" crease="faint" />
    <Round paths={BODY.tailHub} />
    {BODY.tailBlades.map((paths, index) => (
      <Solid key={index} paths={paths} tone="hi" crease="lo" />
    ))}
    {BODY.cross.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    <Solid paths={BODY.plates[0]!} tone="mid" crease="faint" />
    <Solid
      paths={BODY.plates[1]!}
      tone="mid"
      crease="faint"
      inner={<Line d={BODY.holes} tone="lo" />}
    />
    <Round paths={BODY.brace[1]!} tone="mid" />
    <Solid paths={BODY.canopy} tone="hi" crease="none" />
    {BODY.skidNear.struts.map((paths, index) => (
      <Round key={index} paths={paths} tone="mid" />
    ))}
    <Round paths={BODY.skidNear.tube} tone="mid" />
    <Round paths={BODY.skidNear.toe} tone="mid" />
  </g>
);

const BODY_TOP = (
  <g key="body-top">
    <Round paths={BODY.shaft} />
    <Round paths={BODY.swash} tone="mid" />
    <Solid paths={BODY.hub} tone="hi" crease="lo" />
    <Round paths={BODY.button} tone="mid" />
  </g>
);

const DISPLAY = (
  <g key="display">
    <Solid paths={BENCH.stalk} tone="mid" crease="none" />
    <Solid paths={BENCH.display} tone="mid" crease="faint" />
    <Line d={BENCH.window} tone="lo" />
    <Dots points={BENCH.led} size={0.6} tone="hi" />
  </g>
);

const LABEL = `A ${WEIGHT} gram 450 helicopter strapped down on a bench scale, its rotor held at ${HEADSPEED} rpm. As the collective adds pitch the rotor carries more of the weight and the scale reads less, down to zero at about ${HOVER_PITCH} degrees: the hover. Beyond that it lifts against the strap.`;

export function HoverBenchArt() {
  return (
    <HoverBenchLive
      label={LABEL}
      bench={BENCH_ART}
      back={BODY_BACK}
      mid={BODY_MID}
      top={BODY_TOP}
      display={DISPLAY}
      faces={{ grams: BENCH.faceGrams, unit: BENCH.faceUnit }}
    />
  );
}
