import { ApartStage } from "../apart/stage";
import { PLANE_SPEC } from "./spec";

/** The guide's opener: the trainer comes apart during the first scroll. */
export function PlaneApartStage({ figure }: { figure: React.ReactNode }) {
  return <ApartStage figure={figure} spec={PLANE_SPEC} label="The trainer, coming apart" />;
}
