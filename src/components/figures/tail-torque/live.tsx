"use client";

import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { LiveSolid, paint } from "../live-solid";
import { PLATE, SHAFT, bodyOf, type BodyFrame } from "./frame";
import { HOVER_PITCH, PITCH, STOP_DEG, readoutOf, spokenOf, twistOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

const EASE = 0.15; // your thumb on the rudder stick
const SWING = { stiffness: 18, damping: 3 }; // the body on its spring swings once or twice
const NUDGE = 0.5; // degrees of pitch
const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

const TOUR: Array<[number, number]> = [
  [0, 0],
  [1.5, 0],
  [4, PITCH.to],
  [6, PITCH.to],
  [8.5, HOVER_PITCH],
  [12, HOVER_PITCH],
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
const START = bodyOf(twistOf(HOVER_PITCH), HOVER_PITCH);

function apply(root: HTMLElement, f: BodyFrame) {
  const one = (name: string) => root.querySelector(`[data-node="${name}"]`);
  paint(one("pointer"), f.pointer);
  paint(one("boom"), f.boom);
  paint(one("fin"), f.fin);
  paint(one("gearbox"), f.gearbox);
  paint(one("tail-hub"), f.tailHub);
  paint(one("tail-blade-0"), f.tailBlades[0]);
  paint(one("tail-blade-1"), f.tailBlades[1]);
  paint(one("frame"), f.frame);
  paint(one("canopy"), f.canopy);
  paint(one("blade-far"), f.blades[0]);
  paint(one("hub"), f.hub);
  paint(one("blade-near"), f.blades[1]);
  one("index")?.setAttribute("d", f.index);
  const tip = one("tip");
  tip?.setAttribute("cx", `${f.tip[0]}`);
  tip?.setAttribute("cy", `${f.tip[1]}`);
}

export function TailTorqueLive({
  label,
  back,
  table,
}: {
  label: string;
  back: React.ReactNode;
  table: React.ReactNode;
}) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const pitch = React.useRef(HOVER_PITCH);
  const target = React.useRef(HOVER_PITCH);
  const twist = React.useRef(twistOf(HOVER_PITCH));
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
    apply(node, bodyOf(twist.current, pitch.current));
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
      const goal = twistOf(pitch.current);
      if (calm) {
        twist.current = goal;
        swing.current = 0;
      } else {
        const steps = 4;
        const slice = dt / steps;
        for (let step = 0; step < steps; step++) {
          swing.current +=
            ((goal - twist.current) * SWING.stiffness - swing.current * SWING.damping) * slice;
          twist.current += swing.current * slice;
          if (Math.abs(twist.current) > STOP_DEG) {
            twist.current = Math.sign(twist.current) * STOP_DEG;
            swing.current = 0;
          }
        }
        if (Math.abs(goal - twist.current) < 0.01 && Math.abs(swing.current) < 0.01) {
          twist.current = goal;
          swing.current = 0;
        }
      }
      draw();
      const settled = pitch.current === want && twist.current === goal && swing.current === 0;
      frame.current = !touring.current && settled ? 0 : requestAnimationFrame(tick);
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
      aria-label="Tail rotor pitch. Arrow keys add or take away pitch."
      aria-valuemin={PITCH.from}
      aria-valuemax={PITCH.to}
      aria-valuenow={HOVER_PITCH}
      aria-valuetext={spokenOf(HOVER_PITCH)}
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
        else if (event.key === "0" || event.key === "Escape") next = HOVER_PITCH;
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(next);
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {back}
        <LiveSolid node="pointer" paths={START.pointer} crease="none" />
        <g className="iso-dots" data-tone="hi">
          <circle data-node="tip" cx={START.tip[0]} cy={START.tip[1]} r={0.9} />
        </g>
        <LiveSolid node="fin" paths={START.fin} />
        <LiveSolid node="boom" paths={START.boom} tone="mid" crease="none" />
        <LiveSolid node="gearbox" paths={START.gearbox} tone="mid" crease="faint" />
        <LiveSolid node="tail-hub" paths={START.tailHub} crease="none" />
        <LiveSolid node="tail-blade-0" paths={START.tailBlades[0]} lit />
        <LiveSolid node="tail-blade-1" paths={START.tailBlades[1]} lit />
        {table}
        <LiveSolid node="plate" paths={PLATE} tone="mid" crease="none" />
        {/* a pointer: its tip reads the ring's ticks */}
        <path
          data-node="index"
          className="iso-line"
          data-tone="hi"
          data-free="end"
          d={START.index}
        />
        <LiveSolid node="frame" paths={START.frame} tone="mid" crease="faint" />
        <LiveSolid node="shaft" paths={SHAFT} crease="none" />
        <LiveSolid node="canopy" paths={START.canopy} crease="none" />
        <LiveSolid node="blade-far" paths={START.blades[0]} />
        <LiveSolid node="hub" paths={START.hub} />
        <LiveSolid node="blade-near" paths={START.blades[1]} />
      </IsoFigure>
    </div>
  );
}
