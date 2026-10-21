"use client";

import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { LiveSolid, paint } from "../live-solid";
import { rotorOf, type RotorFrame } from "./frame";
import { HOVER_PITCH, PITCH, readoutOf, spokenOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

const TURN_SPEED = 96; // degrees a second: a strobe, not the real 2,600 rpm
const STILL_TURN = 30;
const EASE = 0.18;
const NUDGE = 0.5;
const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

const TOUR: Array<[number, number]> = [
  [0, 0],
  [1.5, 0],
  [4.5, HOVER_PITCH],
  [7, HOVER_PITCH],
  [9, PITCH.to],
  [11, PITCH.to],
  [13.5, 2],
  [15, 2],
  [17, HOVER_PITCH],
  [19, HOVER_PITCH],
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
  return HOVER_PITCH;
}

const clampPitch = (deg: number) => Math.min(PITCH.to, Math.max(PITCH.from, deg));
const START = rotorOf(STILL_TURN, 0);

function apply(root: HTMLElement, f: RotorFrame) {
  const one = (name: string) => root.querySelector(`[data-node="${name}"]`);
  root.querySelectorAll("[data-lifted]").forEach((node) => {
    if (f.lifted) node.setAttribute("transform", f.lifted);
    else node.removeAttribute("transform");
  });
  paint(one("blade-far"), f.blades[0]);
  paint(one("blade-near"), f.blades[1]);
  paint(one("strap-far"), f.straps[0]);
  paint(one("strap-near"), f.straps[1]);
  const grams = one("grams");
  if (grams && grams.textContent !== f.grams) grams.textContent = f.grams;
}

export function HoverBenchLive({
  label,
  bench,
  back,
  mid,
  top,
  display,
  faces,
}: {
  label: string;
  bench: React.ReactNode;
  back: React.ReactNode;
  mid: React.ReactNode;
  top: React.ReactNode;
  display: React.ReactNode;
  faces: { grams: string; unit: string };
}) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const pitch = React.useRef(0);
  const target = React.useRef(0);
  const turn = React.useRef(STILL_TURN);
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
    apply(node, rotorOf(turn.current, pitch.current));
    say(readoutOf(pitch.current));
    const value = pitch.current.toFixed(1);
    if (node.getAttribute("aria-valuenow") !== value) {
      node.setAttribute("aria-valuenow", value);
      node.setAttribute("aria-valuetext", spokenOf(pitch.current));
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
      pitch.current = calm
        ? want
        : pitch.current + (want - pitch.current) * (1 - Math.exp(-dt / EASE));
      if (Math.abs(want - pitch.current) < 0.005) pitch.current = want;
      if (!calm) turn.current = (turn.current + TURN_SPEED * dt) % 360;
      draw();
      // The rotor keeps turning while on screen; under reduced motion it rests.
      frame.current = calm && pitch.current === want ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (deg: number) => {
      touring.current = false;
      target.current = clampPitch(deg);
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
      run();
      return () => {
        window.clearTimeout(timer);
        touring.current = false;
      };
    }
    touring.current = false;
    run();
  }, [visible, idle, engaged, run, stop]);

  const pitchAt = (clientX: number) => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    const share = ((clientX - box.left) / box.width - 0.15) / 0.7;
    return PITCH.from + share * (PITCH.to - PITCH.from);
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
      className="cursor-ew-resize touch-pan-y rounded-lg select-none [-webkit-tap-highlight-color:transparent] [&_.iso-svg]:overflow-visible"
      role="slider"
      tabIndex={0}
      aria-label="Collective pitch. Arrow keys add or take away pitch."
      aria-valuemin={PITCH.from}
      aria-valuemax={PITCH.to}
      aria-valuenow={0}
      aria-valuetext={spokenOf(0)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") engage();
      }}
      onPointerMove={(event) => {
        const deg = pitchAt(event.clientX);
        if (deg === null) return;
        if (event.pointerType === "mouse" || user.current) {
          wake();
          steer(deg);
        }
      }}
      onPointerDown={(event) => {
        const deg = pitchAt(event.clientX);
        if (deg === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        user.current = true;
        engage();
        wake();
        steer(deg);
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
        else if (event.key === "Home") next = PITCH.from;
        else if (event.key === "End") next = PITCH.to;
        else if (event.key === "0" || event.key === "Escape") next = 0;
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(next);
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {bench}
        <g data-lifted="">{back}</g>
        <LiveSolid node="strap-far" paths={START.straps[0]} tone="mid" crease="none" />
        <g data-lifted="">{mid}</g>
        <LiveSolid node="strap-near" paths={START.straps[1]} tone="mid" crease="none" />
        <g data-lifted="">
          {top}
          <LiveSolid node="blade-far" paths={START.blades[0]} lit />
        </g>
        {display}
        <text
          data-node="grams"
          className="iso-face-text tsd-lcd tsd-lcd-big"
          transform={faces.grams}
        >
          {START.grams}
        </text>
        <text className="iso-face-text tsd-lcd" transform={faces.unit}>
          grams
        </text>
        <g data-lifted="">
          <LiveSolid node="blade-near" paths={START.blades[1]} lit />
        </g>
      </IsoFigure>
    </div>
  );
}
