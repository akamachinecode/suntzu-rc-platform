"use client";

import * as React from "react";
import { translateAlong } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { useApart } from "./context";
import { MOVES, NAMES, STAGGER, phaseOf, shareOf, type Assembly } from "./model";
import { HEIGHT, P, WIDTH } from "./view";

export interface Slot {
  key: string;
  asm?: Assembly;
  node: React.ReactNode;
}

// Raptor-like spring: just under critical, so the parts settle with a little weight.
const STIFFNESS = 64;
const DAMPING = 14.2;
const SUBSTEPS = 4;
const LONGEST_FRAME = 1 / 30;
const INTRO_DELAY = 700;
const INTRO_HOLD = 1300;
const INTRO_SHARE = 0.16;

const fine = (value: number) => Math.round(value * 100) / 100;

/** Moves every slot of every assembly to its share of the explode. */
function place(root: HTMLElement, p: number) {
  STAGGER.forEach((asm, index) => {
    const share = shareOf(index, p);
    const [dx, dy, dz] = MOVES[asm];
    const move = share > 0.0005 ? translateAlong(P, [dx * share, dy * share, dz * share]) : null;
    root.querySelectorAll(`[data-asm="${asm}"]`).forEach((node) => {
      if (move) node.setAttribute("transform", move);
      else node.removeAttribute("transform");
    });
  });
}

export function PlaneApartLive({
  label,
  slots,
  parts,
}: {
  label: string;
  slots: Slot[];
  parts: number;
}) {
  const { progress, selected, select } = useApart();
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const value = React.useRef(0); // where the parts are
  const speed = React.useRef(0);
  const target = React.useRef(0); // where scroll (or the intro) wants them
  const scrolled = React.useRef(0);
  const intro = React.useRef<"waiting" | "out" | "done">("waiting");
  const frame = React.useRef(0);
  const last = React.useRef(0);

  const describe = React.useCallback(
    (p: number) => {
      if (selected) {
        say(`${NAMES[selected].name} · ${fine(p * 100).toFixed(0)}% apart`);
        return;
      }
      const phase = phaseOf(p);
      say(
        phase === "coming apart"
          ? `coming apart · ${Math.round(p * 100)}%`
          : `${phase} · ${STAGGER.length} assemblies · ${parts} parts`,
      );
    },
    [parts, say, selected],
  );

  const run = React.useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    const tick = (now: number) => {
      const dt = last.current ? Math.min((now - last.current) / 1000, LONGEST_FRAME) : 1 / 60;
      last.current = now;
      const node = root.current;
      if (!node) {
        frame.current = 0;
        return;
      }
      const want = target.current;
      if (asksForStillness()) {
        value.current = want;
        speed.current = 0;
      } else {
        const slice = dt / SUBSTEPS;
        for (let step = 0; step < SUBSTEPS; step++) {
          speed.current +=
            (want - value.current) * STIFFNESS * slice - speed.current * DAMPING * slice;
          value.current += speed.current * slice;
        }
        if (Math.abs(want - value.current) < 5e-4 && Math.abs(speed.current) < 5e-4) {
          value.current = want;
          speed.current = 0;
        }
      }
      const p = Math.min(1, Math.max(0, value.current));
      place(node, p);
      describe(p);
      const settled = value.current === want && speed.current === 0;
      frame.current = settled ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [describe, root]);

  const aim = React.useCallback(() => {
    target.current =
      intro.current === "out" ? Math.max(scrolled.current, INTRO_SHARE) : scrolled.current;
    run();
  }, [run]);

  // Scroll drives the explode; the first real scroll also ends the intro.
  React.useEffect(() => {
    if (!progress) return;
    return progress.on("change", (latest) => {
      scrolled.current = latest;
      if (latest > 0.02 && intro.current !== "done") intro.current = "done";
      aim();
    });
  }, [progress, aim]);

  // One orchestrated moment: the first time the figure is seen, it lifts apart a little and settles back.
  React.useEffect(() => {
    if (!visible || intro.current !== "waiting" || asksForStillness()) return;
    const start = window.setTimeout(() => {
      if (intro.current !== "waiting") return;
      intro.current = "out";
      aim();
    }, INTRO_DELAY);
    const back = window.setTimeout(() => {
      if (intro.current === "out") intro.current = "done";
      aim();
    }, INTRO_DELAY + INTRO_HOLD);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(back);
    };
  }, [visible, aim]);

  React.useEffect(() => {
    if (progress) scrolled.current = progress.get();
    aim();
  }, [progress, aim]);

  React.useEffect(() => {
    describe(value.current);
  }, [describe]);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  return (
    <div
      ref={root}
      className="pla"
      data-focus={selected ? "" : undefined}
      onPointerLeave={() => select(null)}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {slots.map((slot) => (
          <g
            key={slot.key}
            data-asm={slot.asm}
            data-on={slot.asm && slot.asm === selected ? "" : undefined}
            onPointerEnter={slot.asm ? () => select(slot.asm!) : undefined}
          >
            {slot.node}
          </g>
        ))}
      </IsoFigure>
    </div>
  );
}
