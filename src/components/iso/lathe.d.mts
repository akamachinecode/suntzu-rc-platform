// Types for the parts of kit/lathe.mjs this project uses. The implementation is the vendored kit.
import type { Flat, Projection, SolidPaths } from "./iso-kit";

type Vec3 = [number, number, number];
type Knot = [number, number] | [number, number, number];

export interface Frame {
  o: Vec3;
  a: Vec3;
  u: Vec3;
  v: Vec3;
}

export interface LatheOptions {
  steps?: number;
  fill?: "auto" | "surface" | "hull" | "facets";
  bevel?: number;
  rims?: "all" | "none" | "first" | "last" | "ends";
  smooth?: boolean | "auto" | { rows?: number; slope?: (s: number) => number };
}

export interface FadedLine {
  d: string;
  alpha: number;
}

export function frameAlong(o: Vec3, a: Vec3): Frame;
export function frameOf(o: Vec3, a: Vec3, u: Vec3, v: Vec3): Frame;
export function pointOf(F: Frame, s: number, r: number, angle: number): Vec3;
export function disc(s0: number, s1: number, r: number, F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function solidOf(profile: Knot[], F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function prismOf(F: Frame, polygon: Array<[number, number]>, s0: number, s1: number, P: Projection): SolidPaths;
export function stadium(r0: number, r1: number, offset: number, steps?: number): Array<[number, number]>;
export function sphereOf(centre: Vec3, r: number, P: Projection, options?: { steps?: number }): SolidPaths;
export function circleOf(F: Frame, s: number, r: number, P: Projection, steps?: number): string;
export function arcOf(
  F: Frame,
  s: number,
  r: number,
  P: Projection,
  options?: { slope?: number; steps?: number; least?: number; inward?: boolean; from?: number; to?: number; trim?: number },
): string;
export function ribsOf(
  F: Frame,
  s0: number,
  s1: number,
  r: number,
  count: number,
  P: Projection,
  options: { phase?: number; twist?: number; least?: number; r1?: number; fade: [number, number]; seams?: boolean | "first" | "last" },
): FadedLine[];
export function dotsOf(F: Frame, s: number, r: number, count: number, P: Projection, options?: { phase?: number; all?: boolean }): Flat[];
