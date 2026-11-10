import { translateAlong } from "@/components/iso/iso-kit";
import type { Slot } from "./live";
import { shareOf, type ApartSpec } from "./spec";

/**
 * An exploded figure in one pose: part-way apart, one assembly lit. Only the groups, for an
 * <svg> to hold. The guide covers on the home page are drawn from it once and kept as SVG
 * files (src/components/home/covers/), so pages carry an image instead of thousands of paths.
 */
export function ApartPose({
  spec,
  slots,
  apart = 0.35,
  lit,
}: {
  spec: ApartSpec;
  slots: Slot[];
  apart?: number;
  lit?: string;
}) {
  return slots.map((slot) => {
    const index = slot.asm ? spec.stagger.indexOf(slot.asm) : -1;
    const share = index < 0 ? 0 : shareOf(spec, index, apart);
    const [dx, dy, dz] = (slot.asm && spec.moves[slot.asm]) || [0, 0, 0];
    return (
      <g
        key={slot.key}
        data-asm={slot.asm}
        data-on={lit && slot.asm === lit ? "" : undefined}
        transform={
          share > 0.0005
            ? translateAlong(spec.projection, [dx * share, dy * share, dz * share])
            : undefined
        }
      >
        {slot.node}
      </g>
    );
  });
}
