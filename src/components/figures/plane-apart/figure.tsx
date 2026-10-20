import { FigureFrame } from "../figure-frame";
import { PlaneApartArt } from "./art";
import { PART_COUNT } from "./geometry";
import { STAGGER } from "./model";

/** The hero figure: a trainer on its stand that comes apart as the page scrolls. */
export function PlaneApartFigure({ fig = "Fig 1" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      heading={false}
      title="Taken apart"
      hint="Scroll to take it apart"
      readout={`assembled · ${STAGGER.length} assemblies · ${PART_COUNT} parts`}
    >
      <PlaneApartArt />
    </FigureFrame>
  );
}
