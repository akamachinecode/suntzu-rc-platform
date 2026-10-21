import { ApartStage } from "../apart/stage";
import { HELI_SPEC } from "./spec";

/** The guide's opener: the helicopter comes apart during the first scroll. */
export function HeliApartStage({ figure }: { figure: React.ReactNode }) {
  return <ApartStage figure={figure} spec={HELI_SPEC} label="The helicopter, coming apart" />;
}
