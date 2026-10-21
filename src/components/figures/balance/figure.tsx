import { FigureFrame } from "../figure-frame";
import { BalanceArt } from "./art";
import { AIRFRAME, BALANCED_AT, BATTERY, CHORD, MARK_PCT, RANGE_PCT, readoutOf } from "./model";

/** The balance point as a beam balance: slide the battery, watch the beam lean. */
export function BalanceFigure({ fig = "Fig 3" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="Finding the balance point"
      hint="Drag across the beam, or use ← →"
      readout={readoutOf(BALANCED_AT)}
      keys={[
        { mark: "lit", label: `The battery, ${BATTERY.grams} g` },
        { mark: "raised", label: `The airframe, ${AIRFRAME.grams} g in lab weights` },
      ]}
      caption={`The knife edge stands at ${MARK_PCT}% of a ${CHORD} mm chord. The airframe balances ${Math.abs(AIRFRAME.at)} mm behind it, so the ${BATTERY.label} pack has to sit about ${Math.round(BALANCED_AT)} mm ahead to bring the whole plane onto the mark. Anywhere from ${RANGE_PCT[0]}% to ${RANGE_PCT[1]}% flies; the marked window on the beam is that range. Weights are typical for a 1.4 m electric trainer.`}
    >
      <BalanceArt />
    </FigureFrame>
  );
}
