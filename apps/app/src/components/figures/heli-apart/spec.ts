import type { ApartSpec } from "../apart/spec";
import { MOVES, NAMES, STAGGER, STEP } from "./model";
import { HEIGHT, P, WIDTH } from "./view";

export const HELI_SPEC: ApartSpec = {
  stagger: STAGGER,
  moves: MOVES,
  names: NAMES,
  step: STEP,
  projection: P,
  width: WIDTH,
  height: HEIGHT,
};
