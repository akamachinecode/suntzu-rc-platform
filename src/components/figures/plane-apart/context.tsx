"use client";

import type { MotionValue } from "motion/react";
import { createContext, useContext } from "react";
import type { Assembly } from "./model";

/** Shared between the hero stage (scroll, assembly list) and the figure that moves. */
export interface ApartControl {
  progress: MotionValue<number> | null;
  selected: Assembly | null;
  select: (assembly: Assembly | null) => void;
}

export const ApartContext = createContext<ApartControl>({
  progress: null,
  selected: null,
  select: () => {},
});

export const useApart = () => useContext(ApartContext);
