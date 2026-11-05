import { FigureFrame } from "../figure-frame";
import { DiffArt } from "./art";
import { SPEED_KMH, STRAIGHT_RPM, TIGHTEST_M, TRACK_MM, TYRE_MM, axleAt, readoutOf } from "./model";

const FULL = axleAt(1);

/** An open differential you can steer: the wheels split their speed, the spiders make it up. */
export function DiffFigure({ fig = "Fig 2" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="The open differential"
      hint="Drag across the axle to steer, or use ← →"
      readout={readoutOf(axleAt(0))}
      keys={[
        { mark: "lit", label: "Spider gears" },
        { mark: "raised", label: "Ring gear, cage, side gears and shafts" },
      ]}
      caption={`A 1/10 truck at ${SPEED_KMH} km/h on ${TYRE_MM} mm tyres turns its wheels at ${Math.round(STRAIGHT_RPM)} rpm going straight. At full lock, a ${TIGHTEST_M} m turn, the inside wheel drops to ${Math.round(Math.min(FULL.left, FULL.right))} rpm and the outside one climbs to ${Math.round(Math.max(FULL.left, FULL.right))} rpm, because the wheels are ${TRACK_MM} mm apart and travel different circles. The case always turns at their average. The diff is drawn larger than life and turns at a fortieth of its real speed; dimensions are typical for a short-course truck.`}
    >
      <DiffArt />
    </FigureFrame>
  );
}
