"use client";

import * as React from "react";
import type { SolidPaths } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { frameOf } from "./frame";
import { operatingAt, readoutOf, spokenOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

const SPIN_UP = 0.35; // seconds for motor and prop to follow a throttle change
const STROBE = 0.012; // the drawn prop turns at 1.2% of its real speed, like a strobe
const NUDGE = 0.05;
const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

/** Idle tour: half throttle, full throttle, back to idle. Pairs of [seconds, throttle]. */
const TOUR: Array<[number, number]> = [
  [0, 0],
  [0.8, 0],
  [2.2, 0.5],
  [4.0, 0.5],
  [5.4, 1],
  [8.0, 1],
  [9.6, 0],
  [11.4, 0],
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
  return 0;
}

function LiveSolid({ node, paths }: { node: string; paths: SolidPaths }) {
  return (
    <g data-node={node} className="iso-solid">
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
      <path data-k="outline" className="iso-line iso-edge" data-tone="hi" d={paths.outline} />
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

interface Props {
  label: string;
  base: React.ReactNode;
  backRow: React.ReactNode;
  leverBehind: React.ReactNode;
  lever: React.ReactNode;
  frontLeft: React.ReactNode;
  motor: React.ReactNode;
  hub: React.ReactNode;
  frontRight: React.ReactNode;
  disc: string;
  text: { amps: string; watts: string; grams: string };
}

const REST = frameOf(0, 0);

export function ThrustStandLive(props: Props) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const throttle = React.useRef(0);
  const target = React.useRef(0);
  const phase = React.useRef(0);
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
    const op = operatingAt(throttle.current);
    const f = frameOf(phase.current, throttle.current);
    paint(node.querySelector('[data-node="blade-a"]'), f.blades[0]);
    paint(node.querySelector('[data-node="blade-b"]'), f.blades[1]);
    node.querySelector('[data-node="pointer"]')?.setAttribute("d", f.pointer);
    const tip = node.querySelector('[data-node="pointer-tip"]');
    tip?.setAttribute("cx", `${f.pointerTip[0]}`);
    tip?.setAttribute("cy", `${f.pointerTip[1]}`);
    // Spinning blades blur into a disc, the way a camera sees them.
    const blur = Math.min(1, Math.max(0, (op.rpm - 900) / 5200));
    node.style.setProperty("--tsd-blade", `${1 - 0.72 * blur}`);
    node.style.setProperty("--tsd-disc", `${0.55 * blur}`);
    const write = (name: string, text: string) => {
      const el = node.querySelector(`[data-node="${name}"]`);
      if (el && el.textContent !== text) el.textContent = text;
    };
    write("grams", `${Math.round(op.grams)} g`);
    write("amps", `${op.amps.toFixed(1)} A`);
    write("watts", `${Math.round(op.watts)} W`);
    say(readoutOf(op));
    const value = `${Math.round(op.throttle * 100)}`;
    if (node.getAttribute("aria-valuenow") !== value) {
      node.setAttribute("aria-valuenow", value);
      node.setAttribute("aria-valuetext", spokenOf(op));
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
      throttle.current = calm
        ? want
        : throttle.current + (want - throttle.current) * (1 - Math.exp(-dt / SPIN_UP));
      if (Math.abs(want - throttle.current) < 1e-3) throttle.current = want;
      const rpm = operatingAt(throttle.current).rpm;
      if (!calm) phase.current = (phase.current + (rpm / 60) * 360 * STROBE * dt) % 360;
      draw();
      const spinning = rpm > 0 && !calm;
      frame.current =
        !touring.current && throttle.current === want && !spinning
          ? 0
          : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (value: number) => {
      touring.current = false;
      target.current = Math.min(1, Math.max(0, value));
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

  const throttleAt = (clientX: number) => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return ((clientX - box.left) / box.width - 0.2) / 0.6;
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
      className="tsd"
      role="slider"
      tabIndex={0}
      aria-label="Thrust stand throttle. Arrow keys change the throttle, Home cuts it, End is full throttle."
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={spokenOf(operatingAt(0))}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") engage();
      }}
      onPointerMove={(event) => {
        const value = throttleAt(event.clientX);
        if (value === null) return;
        if (event.pointerType === "mouse" || user.current) {
          wake();
          steer(value);
        }
      }}
      onPointerDown={(event) => {
        const value = throttleAt(event.clientX);
        if (value === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        user.current = true;
        engage();
        wake();
        steer(value);
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
        else if (event.key === "Home" || event.key === "Escape" || event.key === "0") next = 0;
        else if (event.key === "End") next = 1;
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(Math.round(next * 100) / 100);
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={props.label}>
        {props.base}
        {props.backRow}
        <path data-node="pointer" className="iso-line" data-tone="hi" d={REST.pointer} />
        <g className="iso-dots" data-tone="hi">
          <circle data-node="pointer-tip" cx={REST.pointerTip[0]} cy={REST.pointerTip[1]} r={0.6} />
        </g>
        {props.leverBehind}
        {props.lever}
        {props.frontLeft}
        <text data-node="amps" className="iso-face-text tsd-lcd" transform={props.text.amps}>
          0.0 A
        </text>
        <text data-node="watts" className="iso-face-text tsd-lcd" transform={props.text.watts}>
          0 W
        </text>
        {props.motor}
        <g className="tsd-blades">
          <LiveSolid node="blade-a" paths={REST.blades[0]} />
          <LiveSolid node="blade-b" paths={REST.blades[1]} />
        </g>
        <path className="tsd-disc" d={props.disc} />
        {props.hub}
        {props.frontRight}
        <text
          data-node="grams"
          className="iso-face-text tsd-lcd tsd-lcd-big"
          transform={props.text.grams}
        >
          0 g
        </text>
      </IsoFigure>
    </div>
  );
}
