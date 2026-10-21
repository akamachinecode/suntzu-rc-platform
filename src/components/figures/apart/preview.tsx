import "@/components/iso/iso.css";
import { translateAlong } from "@/components/iso/iso-kit";
import type { Slot } from "./live";
import { shareOf, type ApartSpec } from "./spec";

/**
 * An exploded figure as a still: part-way apart, one assembly lit. Drawn on the server,
 * with nothing to run in the page. Used on a guide's cover.
 */
export function ApartPreview({
  spec,
  slots,
  apart = 0.35,
  lit,
  view = [0, 0, spec.width, spec.height],
  label,
}: {
  spec: ApartSpec;
  slots: Slot[];
  apart?: number;
  lit?: string;
  /** The part of the drawing to show, as a viewBox: a still can be cropped to its pose. */
  view?: [number, number, number, number];
  label: string;
}) {
  return (
    <div className="iso servo-figure" data-theme="light">
      <div className="pla" data-focus={lit ? "" : undefined}>
        <div className="iso-stage">
          <svg
            className="iso-svg"
            viewBox={view.join(" ")}
            role="img"
            aria-label={label}
            focusable="false"
          >
            {slots.map((slot) => {
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
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
