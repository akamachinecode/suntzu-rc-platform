import { Dots, Line, Solid } from "@/components/iso/react/draw";
import { BENCH } from "./geometry";
import { TailTorqueLive } from "./live";
import { HOVER_PITCH, MAIN_TORQUE } from "./model";

const BACK = (
  <g key="back">
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
    <Solid paths={BENCH.scale} tone="mid" crease="faint" />
    <Line d={BENCH.minor} tone="lo" />
    <Line d={BENCH.major} tone="mid" />
    <Line d={BENCH.zero} tone="hi" />
  </g>
);

const TABLE = (
  <g key="table">
    <Solid paths={BENCH.ring} tone="mid" crease="faint" />
    <Line d={BENCH.ringTicks} tone="lo" />
  </g>
);

const LABEL = `A helicopter body on a turntable with a torsion spring. Its main rotor needs about ${MAIN_TORQUE} newton metres to keep turning, and that torque twists the body the other way. The tail rotor pushes back; at about ${HOVER_PITCH} degrees of tail pitch the two cancel and the pointer under the tail reads zero.`;

export function TailTorqueArt() {
  return <TailTorqueLive label={LABEL} back={BACK} table={TABLE} />;
}
