import { FigureFrame } from "../figure-frame";
import { ShockArt } from "./art";
import { DROP_MM, HERTZ, MASS_KG, STOCK_CST, dropOf, readoutOf } from "./model";

const STOCK = dropOf(STOCK_CST);
const THIN = dropOf(150);
const THICK = dropOf(900);

/** A shock dyno: change the oil and watch the drop test bounce, or not. */
export function ShockFigure({ fig = "Fig 3" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      title="The shock dyno"
      hint="Drag across the rig to change the oil, or use ← →"
      readout={readoutOf(STOCK)}
      keys={[
        { mark: "lit", label: "Oil-filled shock body" },
        { mark: "raised", label: "Spring, carriage and weights" },
      ]}
      caption={`One corner of a 1928 g Team Associated Pro2 SC10: ${Math.round(MASS_KG * 1000)} g on a spring that bounces about ${HERTZ.toFixed(1)} times a second, let go ${DROP_MM} mm high. With the stock 30wt oil (${STOCK_CST} cSt) it overshoots ${STOCK.overshoot.toFixed(1)} mm and settles in ${STOCK.settle?.toFixed(2)} s. At 150 cSt it overshoots ${THIN.overshoot.toFixed(1)} mm; at 900 cSt it barely overshoots but creeps home${THICK.settle ? ` in ${THICK.settle.toFixed(2)} s` : ""}. The piston stays the same and damping is taken to grow in proportion to the oil's viscosity, which is close for a given piston; the spring rate is chosen for a typical bounce. The drop is shown six times slower than it happens.`}
    >
      <ShockArt />
    </FigureFrame>
  );
}
