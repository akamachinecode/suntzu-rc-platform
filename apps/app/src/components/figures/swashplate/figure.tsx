import { FigureFrame } from "../figure-frame";
import { SwashplateArt } from "./art";
import { COLLECTIVE_MM, CYCLIC_DEG, sweepOf } from "./model";

const FULL_UP = sweepOf({ collective: 1, cyclic: 0 });
const FULL_FORWARD = sweepOf({ collective: 0, cyclic: 1 });

/** The swashplate: stick in, blade pitch out, once per turn. */
export function SwashplateFigure({ fig = "Fig 2" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="From stick to swashplate"
      hint="Move across the bench: up and down is collective, left and right is cyclic. Or use the arrow keys."
      readout="collective 0.0° · plate level · blades 0.0° to 0.0°"
      keys={[
        { mark: "lit", label: "The blades, cut short to fit the bench" },
        { mark: "raised", label: "Servos, swashplate and the links between them" },
      ]}
      caption={`A 450-class head on three servos, 120° apart. The plate slides ${COLLECTIVE_MM} mm either way for full collective, which turns into ${FULL_UP.high.toFixed(0)}° of pitch on both blades at once, and tilts up to ${CYCLIC_DEG}° for full cyclic, which sends each blade from −${Math.abs(FULL_FORWARD.low).toFixed(0)}° to +${FULL_FORWARD.high.toFixed(0)}° and back once per turn. The head turns far slower than a real one, like a strobe, and real heads differ in their link lengths and mixing.`}
    >
      <SwashplateArt />
    </FigureFrame>
  );
}
