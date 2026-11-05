import type { Point3, Projection } from "@/components/iso/iso-kit";

/**
 * Everything an exploded figure needs to come apart: the order the assemblies leave in,
 * the direction each one travels, their names and the camera. Plain data, so a server
 * component can hand it to the live figure.
 */
export interface ApartSpec {
  stagger: string[];
  moves: Record<string, Point3>;
  names: Record<string, { name: string; does: string }>;
  /** Gap between assemblies along the explode, as a share of the whole travel. */
  step: number;
  projection: Projection;
  width: number;
  height: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** How far one assembly is out, 0 … 1, when the explode as a whole is at `p`. */
export function shareOf(spec: ApartSpec, index: number, p: number) {
  const span = 1 - spec.step * (spec.stagger.length - 1);
  return smooth(clamp01((p - index * spec.step) / span));
}

export function phaseOf(p: number) {
  if (p < 0.005) return "assembled";
  if (p > 0.995) return "apart";
  return "coming apart";
}
