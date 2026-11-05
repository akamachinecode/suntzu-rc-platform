import { FigureFrame } from "../figure-frame";
import { CarApartArt } from "./art";
import { PART_COUNT } from "./geometry";
import { STAGGER } from "./model";

/** The hero figure: a short-course truck on its post that comes apart as the page scrolls. */
export function CarApartFigure({ fig = "Fig 1" }: { fig?: string }) {
  return (
    <FigureFrame
      fig={fig}
      heading={false}
      title="Taken apart"
      readout={`assembled · ${STAGGER.length} assemblies · ${PART_COUNT} parts`}
    >
      <CarApartArt />
    </FigureFrame>
  );
}
