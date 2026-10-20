import { FigureFrame } from "../figure-frame";
import { ThrustStandArt } from "./art";
import { LEVER_RATIO } from "./geometry";
import { FULL, KV, PACK_VOLTS, PROP, operatingAt, readoutOf } from "./model";

const HALF = operatingAt(0.5);

/** A thrust stand: throttle in, rpm, current, power and thrust out. */
export function ThrustStandFigure({ fig = "Fig 3" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="Thrust stand"
      hint="Drag across the bench, or use ← →"
      readout={readoutOf(operatingAt(0))}
      keys={[
        { mark: "raised", label: "Motor, prop and lever" },
        { mark: "edge", label: "Power, signal and load-cell leads" },
      ]}
      caption={`A ${KV} KV motor on a ${PACK_VOLTS} V pack with a ${PROP.inches} prop. Half throttle gives ${Math.round(HALF.grams)} g for ${Math.round(HALF.watts)} W; full throttle gives ${Math.round(FULL.grams)} g for ${Math.round(FULL.watts)} W, because thrust grows with rpm squared and power with rpm cubed. Figures come from the standard prop equations with coefficients typical of a sport ${PROP.inches}, so a real prop will differ a little. The lever presses the load cell ${LEVER_RATIO.toFixed(1)} times harder than the prop pulls, and the display is calibrated for it. The drawn prop turns slower than the real one, like a strobe.`}
    >
      <ThrustStandArt />
    </FigureFrame>
  );
}
