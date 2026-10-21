"use client";

import * as React from "react";
import type { Flat, SolidPaths, Tone } from "@/components/iso/iso-kit";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { KNURL_LEVELS, frameOf, type Frame } from "./frame";
import { REST, clamp, readoutOf, spokenOf, stepServo, type State } from "./model";
import { HEIGHT, WIDTH } from "./view";

const HAND = 0.12; // seconds for the thumb to settle on a new stick position
const NUDGE = 0.1;
const TOUR_FIRST = 1.2;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

/** The idle tour: full up, full down, back to neutral. Pairs of [seconds, stick]. */
const TOUR: Array<[number, number]> = [
  [0, 0],
  [0.8, 0],
  [2.2, 1],
  [3.6, 1],
  [5.6, -1],
  [7, -1],
  [8.4, 0.35],
  [9.4, 0.35],
  [10.6, 0],
  [11.6, 0],
];
const TOUR_LENGTH = TOUR.at(-1)![0];

function tourAt(time: number) {
  const t = time % TOUR_LENGTH;
  for (let index = 1; index < TOUR.length; index++) {
    const [t1, v1] = TOUR[index]!;
    const [t0, v0] = TOUR[index - 1]!;
    if (t <= t1) {
      const u = clamp((t - t0) / (t1 - t0 || 1), 0, 1);
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return 0;
}

const REST_FRAME = frameOf(REST);
const RESTING_TEXT = spokenOf(REST);

/* A solid whose paths change every frame: rendered once, then repainted through its element. */

function LiveSolid({
  node,
  paths,
  tone = "hi",
  crease = "faint",
  lit = false,
}: {
  node: string;
  paths: SolidPaths;
  tone?: Tone;
  crease?: Tone | "none";
  lit?: boolean;
}) {
  return (
    <g
      data-node={node}
      className="iso-solid"
      data-lit={lit ? "" : undefined}
      data-seamless={paths.seamless ? "" : undefined}
    >
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
      {crease === "none" ? null : (
        <path data-k="crease" className="iso-line iso-crease" data-tone={crease} d={paths.crease} />
      )}
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
  if (paths.seamless) node.setAttribute("data-seamless", "");
  else node.removeAttribute("data-seamless");
}

function place(nodes: Element[], points: Flat[]) {
  points.forEach(([x, y], index) => {
    const node = nodes[index];
    if (!node) return;
    node.setAttribute("cx", `${Math.round(x * 10) / 10}`);
    node.setAttribute("cy", `${Math.round(y * 10) / 10}`);
  });
}

/** Finds the live parts by their data-node names. Only called from effects and the frame loop. */
function nodesIn(root: Element) {
  const one = (name: string) => root.querySelector(`[data-node="${name}"]`);
  const all = (name: string) => Array.from(root.querySelectorAll(`[data-node="${name}"]`));
  return {
    collar: one("collar"),
    shaft: one("shaft"),
    grip: one("grip"),
    knurl: all("knurl"),
    arm: one("arm"),
    armHoles: all("arm-hole"),
    hub: one("hub"),
    hubDot: all("hub-dot"),
    horn: one("horn"),
    hornHoles: all("horn-hole"),
    elevator: one("elevator"),
    bend: one("bend"),
    rod: one("rod"),
    clevis: one("clevis"),
    pin: one("pin"),
  };
}

type Nodes = ReturnType<typeof nodesIn>;

function apply(nodes: Nodes, frame: Frame) {
  paint(nodes.collar, frame.stick.collar);
  paint(nodes.shaft, frame.stick.shaft);
  paint(nodes.grip, frame.stick.grip);
  frame.stick.knurl.forEach((d, index) => nodes.knurl[index]?.setAttribute("d", d));
  paint(nodes.arm, frame.arm.arm);
  place(nodes.armHoles, frame.arm.holes);
  nodes.hub?.setAttribute("d", frame.arm.hub);
  place(nodes.hubDot, [frame.arm.hubDot]);
  paint(nodes.horn, frame.surface.horn);
  place(nodes.hornHoles, frame.surface.hornHoles);
  paint(nodes.elevator, frame.surface.elevator);
  paint(nodes.bend, frame.rod.bend);
  paint(nodes.rod, frame.rod.rod);
  paint(nodes.clevis, frame.rod.clevis);
  paint(nodes.pin, frame.rod.pin);
}

interface Props {
  label: string;
  base: React.ReactNode;
  clampBelow: React.ReactNode;
  leads: React.ReactNode;
  gimbal: React.ReactNode;
  receiver: React.ReactNode;
  mounts: React.ReactNode;
  servoLead: React.ReactNode;
  servo: React.ReactNode;
  stab: React.ReactNode;
  clampAbove: React.ReactNode;
  ruler: React.ReactNode;
}

export function ThumbToElevatorLive(props: Props) {
  // One ref for the whole figure: the readout anchor, the in-view watch and the node lookup.
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const nodes = React.useRef<Nodes | null>(null);
  const state = React.useRef<State>({ ...REST });
  const target = React.useRef(0);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const clock = React.useRef(0);
  const touring = React.useRef(false);
  const user = React.useRef(false);
  const [engaged, setEngaged] = React.useState(false);
  const [idle, setIdle] = React.useState(true);
  const [poke, setPoke] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const draw = React.useCallback(() => {
    const node = root.current;
    if (!node) return;
    nodes.current ??= nodesIn(node);
    apply(nodes.current, frameOf(state.current));
    say(readoutOf(state.current));
    const value = `${Math.round(state.current.stick * 100)}`;
    if (node.getAttribute("aria-valuenow") !== value) node.setAttribute("aria-valuenow", value);
    const spoken = spokenOf(state.current);
    if (node.getAttribute("aria-valuetext") !== spoken) node.setAttribute("aria-valuetext", spoken);
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
      const s = state.current;
      const want = target.current;
      s.stick = calm ? want : s.stick + (want - s.stick) * (1 - Math.exp(-dt / HAND));
      if (Math.abs(want - s.stick) < 1e-3) s.stick = want;
      const servoDone = stepServo(s, dt, calm);
      draw();
      const done = !touring.current && s.stick === want && servoDone;
      frame.current = done ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (stick: number) => {
      touring.current = false;
      target.current = clamp(stick, -1, 1);
      run();
    },
    [run],
  );

  React.useEffect(() => stop, [stop]);

  // After the last touch, wait a little, then let the idle tour take over again.
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
      }, TOUR_FIRST * 1000);
      return () => {
        window.clearTimeout(timer);
        touring.current = false;
      };
    }
    touring.current = false;
    run();
  }, [visible, idle, engaged, run, stop]);

  const stickAt = (clientX: number) => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return clamp(((clientX - box.left) / box.width - 0.5) / 0.36, -1, 1);
  };

  const engage = () => {
    setEngaged(true);
    setIdle(false);
  };

  const wake = () => {
    setIdle(false);
    setPoke((count) => count + 1);
  };

  const rest = REST_FRAME;

  return (
    <div
      ref={root}
      className="tte"
      role="slider"
      tabIndex={0}
      aria-label="Transmitter stick driving an elevator. Use the arrow keys to move the stick, Home and End for full throw, 0 to centre."
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext={RESTING_TEXT}
      data-dragging={dragging ? "" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") engage();
      }}
      onPointerMove={(event) => {
        const stick = stickAt(event.clientX);
        if (stick === null) return;
        if (event.pointerType === "mouse" || user.current) {
          wake();
          steer(stick);
        }
      }}
      onPointerDown={(event) => {
        const stick = stickAt(event.clientX);
        if (stick === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        user.current = true;
        setDragging(true);
        engage();
        wake();
        steer(stick);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        user.current = false;
        setDragging(false);
        if (event.pointerType !== "mouse") setEngaged(false);
      }}
      onPointerCancel={() => {
        user.current = false;
        setDragging(false);
        setEngaged(false);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !user.current) setEngaged(false);
      }}
      onFocus={engage}
      onBlur={() => setEngaged(false)}
      onKeyDown={(event) => {
        const by = event.shiftKey ? NUDGE * 3 : NUDGE;
        let next: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target.current + by;
        else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target.current - by;
        else if (event.key === "Home") next = -1;
        else if (event.key === "End") next = 1;
        else if (event.key === "0" || event.key === "Escape") next = 0;
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(Math.round(next * 100) / 100);
      }}
    >
      <IsoFigure width={WIDTH} height={HEIGHT} label={props.label}>
        {props.base}
        {props.clampBelow}
        {props.leads}
        {props.gimbal}
        <g>
          <LiveSolid node="collar" paths={rest.stick.collar} tone="mid" crease="none" />
          <LiveSolid node="shaft" paths={rest.stick.shaft} tone="hi" crease="none" />
          <LiveSolid node="grip" paths={rest.stick.grip} tone="hi" crease="lo" />
          {KNURL_LEVELS.map((alpha, index) => (
            <path
              key={alpha}
              data-node="knurl"
              className="iso-line"
              data-tone="lo"
              opacity={alpha}
              d={rest.stick.knurl[index]}
            />
          ))}
        </g>
        {props.receiver}
        {props.mounts}
        {props.servoLead}
        {props.servo}
        <g>
          <LiveSolid node="arm" paths={rest.arm.arm} tone="hi" crease="lo" />
          <path data-node="hub" className="iso-line" data-tone="lo" d={rest.arm.hub} />
          <g className="iso-dots" data-tone="hi">
            <circle data-node="hub-dot" cx={rest.arm.hubDot[0]} cy={rest.arm.hubDot[1]} r={0.7} />
          </g>
          <g className="iso-dots tte-holes" data-tone="hi">
            {rest.arm.holes.map(([x, y], index) => (
              <circle key={index} data-node="arm-hole" cx={x} cy={y} r={0.75} />
            ))}
          </g>
        </g>
        {props.stab}
        <g>
          <LiveSolid node="horn" paths={rest.surface.horn} tone="hi" crease="lo" />
          <g className="iso-dots tte-holes" data-tone="hi">
            {rest.surface.hornHoles.map(([x, y], index) => (
              <circle key={index} data-node="horn-hole" cx={x} cy={y} r={0.7} />
            ))}
          </g>
          <LiveSolid node="elevator" paths={rest.surface.elevator} tone="hi" crease="lo" lit />
        </g>
        {props.clampAbove}
        <g>
          <LiveSolid node="bend" paths={rest.rod.bend} tone="hi" crease="none" />
          <LiveSolid node="rod" paths={rest.rod.rod} tone="hi" crease="none" />
          <LiveSolid node="clevis" paths={rest.rod.clevis} tone="hi" crease="lo" />
          <LiveSolid node="pin" paths={rest.rod.pin} tone="mid" crease="none" />
        </g>
        {props.ruler}
      </IsoFigure>
    </div>
  );
}
