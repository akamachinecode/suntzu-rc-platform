"use client";

import type { MotionValue } from "motion/react";
import { createContext, useContext } from "react";

/** Shared between the hero stage (scroll, assembly list) and the figure that moves. */
export interface ApartControl {
  progress: MotionValue<number> | null;
  selected: string | null;
  select: (assembly: string | null) => void;
}

export const ApartContext = createContext<ApartControl>({
  progress: null,
  selected: null,
  select: () => {},
});

export const useApart = () => useContext(ApartContext);
