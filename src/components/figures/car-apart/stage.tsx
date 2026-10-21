import { ApartStage } from "../apart/stage";
import { CAR_SPEC } from "./spec";

/** The guide's opener: the truck comes apart during the first scroll. */
export function CarApartStage({ figure }: { figure: React.ReactNode }) {
  return <ApartStage figure={figure} spec={CAR_SPEC} label="The truck, coming apart" />;
}
