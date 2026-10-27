import type { Discipline } from "@workspace/shared";

/** How disciplines read in a sentence: "wants to try RC planes". */
export const DISCIPLINE_WORDS: Record<Discipline, string> = {
  air: "RC planes",
  rotor: "RC helicopters",
  ground: "RC cars",
  fpv: "FPV drones",
};
