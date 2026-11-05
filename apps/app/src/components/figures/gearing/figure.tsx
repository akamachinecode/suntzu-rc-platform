import { FigureFrame } from "../figure-frame";
import { GearingArt } from "./art";
import {
  INTERNAL,
  KV,
  SPUR,
  STOCK,
  STOCK_PINION,
  TYRE_MM,
  VOLTS,
  gearingOf,
  readoutOf,
} from "./model";

const SMALL = gearingOf(12);
const BIG = gearingOf(24);

/** Pinion in, final drive, rollout and top speed out. */
export function GearingFigure({ fig = "Fig 4" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="Gearing for speed"
      hint="Drag across the bench to change the pinion, or use ← →"
      readout={readoutOf(STOCK)}
      keys={[
        { mark: "lit", label: "The pinion" },
        { mark: "raised", label: "Spur, transmission, motor and wheel" },
      ]}
      caption={`A Team Associated Pro2 SC10: a ${KV} kV motor on ${VOLTS} V, an ${SPUR}-tooth spur and a ${INTERNAL}:1 transmission, on a typical ${TYRE_MM} mm tyre. The stock ${STOCK_PINION}-tooth pinion gives a final drive of ${STOCK.fdr.toFixed(2)}:1 and about ${Math.round(STOCK.kmh)} km/h; a 12-tooth pinion gives ${SMALL.fdr.toFixed(1)}:1 and ${Math.round(SMALL.kmh)} km/h, a 24-tooth ${BIG.fdr.toFixed(1)}:1 and ${Math.round(BIG.kmh)} km/h. Speeds are no-load and theoretical, from the motor's kV; on the ground the truck is slower. The gears turn at half a percent of their real speed.`}
    >
      <GearingArt />
    </FigureFrame>
  );
}
