"use client";

import * as React from "react";
import type { SolidPaths, Tone } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { beamOf, type BeamFrame } from "./geometry";
import { BALANCED_AT, SLIDE, STOP_DEG, cgOf, leanOf, readoutOf, spokenOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

const SLIDE_TIME = 0.15; // the hand easing the battery along
const SWING = { stiffness: 22, damping: 3.2 }; // a lightly damped beam, it swings once or twice
const NUDGE = 5; // mm
const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

const TOUR: Array<[number, number]> = [
  [0, BALANCED_AT],
  [1.2, BALANCED_AT],
  [2.6, SLIDE.to],
  [4.6, SLIDE.to],
  [6.4, SLIDE.from],
  [8.4, SLIDE.from],
  [10, BALANCED_AT],
  [12, BALANCED_AT],
];
const TOUR_LENGTH = TOUR.at(-1)![0];

function tourAt(time: number) {
  const t = time % TOUR_LENGTH;
  for (let index = 1; index < TOUR.length; index++) {
    const [t1, v1] = TOUR[index]!;
    const [t0, v0] = TOUR[index - 1]!;
    if (t <= t1) {
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return BALANCED_AT;
}

const clampSlide = (mm: number) => Math.min(SLIDE.to, Math.max(SLIDE.from, mm));

function LiveSolid({
  node,
  paths,
  tone = "hi",
  lit = false,
}: {
  node: string;
  paths: SolidPaths;
  tone?: Tone;
  lit?: boolean;
}) {
  return (
    <g data-node={node} className="iso-solid" data-lit={lit ? "" : undefined}>
      <path data-k="fill" className="iso-fill" d={paths.fill} />
      {[0, 1, 2, 3].map((shade) => (
        <path
          key={shade}
          data-k={`s${shade}`}
          className="iso-shade"
          data-shade={shade}
          d={paths.shades[shade] ?? ""}
        />
      ))}
      <path data-k="top" className="iso-top" d={paths.top} />
      <path data-k="crease" className="iso-line iso-crease" data-tone="lo" d={paths.crease} />
      <path data-k="outline" className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
    </g>
  );
}

function paint(node: Element | null, paths: SolidPaths) {
  if (!node) return;
  for (const child of Array.from(node.children)) {
    const key = child.getAttribute("data-k");
    const d =
      key === "fill"
        ? paths.fill
        : key === "top"
          ? paths.top
          : key === "crease"
            ? paths.crease
            : key === "outline"
              ? paths.outline
              : key?.startsWith("s")
                ? (paths.shades[Number(key.slice(1))] ?? "")
                : null;
    if (d !== null && child.getAttribute("d") !== d) child.setAttribute("d", d);
  }
}

function apply(root: HTMLElement, f: BeamFrame) {
  const one = (name: string) => root.querySelector(`[data-node="${name}"]`);
  paint(one("beam"), f.beam);
  paint(one("rod"), f.rod);
  f.weights.forEach((paths, index) => paint(one(`weight-${index}`), paths));
  paint(one("pack"), f.pack);
  paint(one("strap"), f.strap);
  for (const name of ["minor", "major", "mark", "range", "packRule", "pointer"] as const)
    one(name)?.setAttribute("d", f[name]);
  const tip = one("tip");
  tip?.setAttribute("cx", `${f.tip[0]}`);
  tip?.setAttribute("cy", `${f.tip[1]}`);
}

const START = beamOf(0, BALANCED_AT);

export function BalanceLive({ label, back }: { label: string; back: React.ReactNode }) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const battery = React.useRef(BALANCED_AT);
  const target = React.useRef(BALANCED_AT);
  const lean = React.useRef(0);
  const swing = React.useRef(0);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const clock = React.useRef(0);
  const touring = React.useRef(false);
  const user = React.useRef(false);
  const [engaged, setEngaged] = React.useState(false);
  const [idle, setIdle] = React.useState(true);
  const [poke, setPoke] = React.useState(0);

  const draw = React.useCallback(() => {
    const node = root.current;
    if (!node) return;
    apply(node, beamOf(lean.current, battery.current));
    say(readoutOf(battery.current));
    const value = `${Math.round(battery.current)}`;
    if (node.getAttribute("aria-valuenow") !== value) {
      node.setAttribute("aria-valuenow", value);
      node.setAttribute("aria-valuetext", spokenOf(battery.current));
    }
  }, [root, say]);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const run = React.useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    const tick = (now: number) => {
      const dt = last.current ? Math.min((now - last.current) / 1000, LONGEST_FRAME) : 1 / 60;
      last.current = now;
      const calm = asksForStillness();
      if (touring.current) {
        clock.current += dt;
        target.current = tourAt(clock.current);
      }
      const want = target.current;
      battery.current = calm
        ? want
        : battery.current + (want - battery.current) * (1 - Math.exp(-dt / SLIDE_TIME));
      if (Math.abs(want - battery.current) < 0.02) battery.current = want;
      const goal = leanOf(cgOf(battery.current).x);
      if (calm) {
        lean.current = goal;
        swing.current = 0;
      } else {
        const steps = 4;
        const slice = dt / steps;
        for (let step = 0; step < steps; step++) {
          swing.current +=
            ((goal - lean.current) * SWING.stiffness - swing.current * SWING.damping) * slice;
          lean.current += swing.current * slice;
          // The stops catch the beam: it stops dead instead of swinging through.
          if (Math.abs(lean.current) > STOP_DEG) {
            lean.current = Math.sign(lean.current) * STOP_DEG;
            swing.current = 0;
          }
        }
        if (Math.abs(goal - lean.current) < 0.01 && Math.abs(swing.current) < 0.01) {
          lean.current = goal;
          swing.current = 0;
        }
      }
      draw();
      const settled = battery.current === want && lean.current === goal && swing.current === 0;
      frame.current = !touring.current && settled ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (mm: number) => {
      touring.current = false;
      target.current = clampSlide(mm);
      run();
    },
    [run],
  );

  React.useEffect(() => stop, [stop]);

  React.useEffect(() => {
    if (engaged) return;
    const timer = window.setTimeout(() => setIdle(true), TOUR_BACK);
    return () => window.clearTimeout(timer);
  }, [engaged, poke]);

  React.useEffect(() => {
    if (!visible) {
      touring.current = false;
      stop();
      return;
    }
    if (idle && !engaged && !asksForStillness()) {
      const timer = window.setTimeout(() => {
        clock.current = 0;
        touring.current = true;
        run();
      }, TOUR_FIRST);
      return () => {
        window.clearTimeout(timer);
        touring.current = false;
      };
    }
    touring.current = false;
    run();
  }, [visible, idle, engaged, run, stop]);

  const mmAt = (clientX: number) => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    const share = ((clientX - box.left) / box.width - 0.3) / 0.6;
    return SLIDE.from + share * (SLIDE.to - SLIDE.from);
  };
  const engage = () => {
    setEngaged(true);
    setIdle(false);
  };
  const wake = () => {
    setIdle(false);
    setPoke((count) => count + 1);
  };

  return (
    <div
      ref={root}
      className="blc"
      role="slider"
      tabIndex={0}
      aria-label="Battery position on the balance beam. Arrow keys slide the battery towards the nose or the tail."
      aria-valuemin={SLIDE.from}
      aria-valuemax={SLIDE.to}
      aria-valuenow={Math.round(BALANCED_AT)}
      aria-valuetext={spokenOf(BALANCED_AT)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") engage();
      }}
      onPointerMove={(event) => {
        const mm = mmAt(event.clientX);
        if (mm === null) return;
        if (event.pointerType === "mouse" || user.current) {
          wake();
          steer(mm);
        }
      }}
      onPointerDown={(event) => {
        const mm = mmAt(event.clientX);
        if (mm === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        user.current = true;
        engage();
        wake();
        steer(mm);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        user.current = false;
        if (event.pointerType !== "mouse") setEngaged(false);
      }}
      onPointerCancel={() => {
        user.current = false;
        setEngaged(false);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !user.current) setEngaged(false);
      }}
      onFocus={engage}
      onBlur={() => setEngaged(false)}
      onKeyDown={(event) => {
        const by = event.shiftKey ? NUDGE * 4 : NUDGE;
        let next: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target.current + by;
        else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target.current - by;
        else if (event.key === "Home") next = SLIDE.from;
        else if (event.key === "End") next = SLIDE.to;
        else if (event.key === "0" || event.key === "Escape") next = BALANCED_AT;
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(next);
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {back}
        {/* The pointer sticks out of the beam's back face, so it is drawn before the beam. */}
        <path
          data-node="pointer"
          className="iso-line blc-needle"
          data-tone="hi"
          d={START.pointer}
        />
        <g className="iso-dots" data-tone="hi">
          <circle data-node="tip" cx={START.tip[0]} cy={START.tip[1]} r={0.8} />
        </g>
        <LiveSolid node="beam" paths={START.beam} />
        <path data-node="minor" className="iso-line" data-tone="lo" d={START.minor} />
        <path data-node="major" className="iso-line" data-tone="mid" d={START.major} />
        <path data-node="range" className="iso-line" data-tone="mid" d={START.range} />
        <path data-node="mark" className="iso-line" data-tone="hi" d={START.mark} />
        <LiveSolid node="rod" paths={START.rod} tone="mid" />
        {START.weights.map((paths, index) => (
          <LiveSolid key={index} node={`weight-${index}`} paths={paths} tone="hi" />
        ))}
        <LiveSolid node="pack" paths={START.pack} lit />
        <path
          data-node="packRule"
          className="iso-line"
          data-tone="lo"
          data-free=""
          d={START.packRule}
        />
        <LiveSolid node="strap" paths={START.strap} tone="mid" />
      </IsoFigure>
    </div>
  );
}
