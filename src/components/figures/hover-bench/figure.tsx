import { FigureFrame } from "../figure-frame";
import { HoverBenchArt } from "./art";
import { HEADSPEED, HOVER_PITCH, WEIGHT, readoutOf } from "./model";

/** Collective in, lift out: the hover is where the scale reads zero. */
export function HoverBenchFigure({ fig = "Fig 4" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="Finding the hover"
      hint="Drag across the bench to set the collective, or use ← →"
      readout={readoutOf(0)}
      keys={[
        { mark: "lit", label: "The main blades, at their collective pitch" },
        { mark: "raised", label: "The helicopter, strapped to the scale" },
      ]}
      caption={`A ${WEIGHT} g 450 (the weight of a Blade 450 3D ready to fly) with its governor holding ${HEADSPEED.toLocaleString("en-US")} rpm. Lift grows roughly in step with pitch at a steady headspeed, and a T-Rex 450 hovers at about +${HOVER_PITCH}°, so that's where the scale reads zero. Real lift curves bend a little and depend on the blades and the air. The rotor turns far slower than a real one, like a strobe.`}
    >
      <HoverBenchArt />
    </FigureFrame>
  );
}
