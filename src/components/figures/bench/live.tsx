"use client";

import * as React from "react";
import type { SolidPaths, Tone } from "@/components/iso/iso-kit";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";

/**
 * What the car guide's benches share: a solid whose paths are rewritten each frame, and one
 * control (a slider across the drawing, arrow keys, an idle tour when nobody touches it).
 */

const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

/** A solid drawn once and repainted with `paint` as it moves. */
export function LiveSolid({
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
      <path data-k="outline" className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
    </g>
  );
}

export function paint(node: Element | null, paths: SolidPaths) {
  if (!node) return;
  for (const child of Array.from(node.children)) {
    const key = child.getAttribute("data-k");
    const d =
      key === "fill"
        ? paths.fill
        : key === "top"
          ? paths.top
          : key === "outline"
            ? paths.outline
            : key?.startsWith("s")
              ? (paths.shades[Number(key.slice(1))] ?? "")
              : null;
    if (d !== null && child.getAttribute("d") !== d) child.setAttribute("d", d);
  }
}

/** Sets `d` (or a dot's centre) on a `[data-node]` element inside root. */
export function setPath(root: Element, name: string, d: string) {
  const el = root.querySelector(`[data-node="${name}"]`);
  if (el && el.getAttribute("d") !== d) el.setAttribute("d", d);
}

export function setDot(root: Element, name: string, [x, y]: [number, number]) {
  const el = root.querySelector(`[data-node="${name}"]`);
  el?.setAttribute("cx", x.toFixed(2));
  el?.setAttribute("cy", y.toFixed(2));
}

/** Pairs of [seconds, value], eased between, looping. */
export function tourAt(tour: Array<[number, number]>, time: number) {
  const length = tour.at(-1)![0];
  const t = time % length;
  for (let index = 1; index < tour.length; index++) {
    const [t1, v1] = tour[index]!;
    const [t0, v0] = tour[index - 1]!;
    if (t <= t1) {
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return tour[0]![1];
}

export interface BenchOptions {
  initial: number;
  min: number;
  max: number;
  /** How far one arrow-key press moves the value (Shift moves four times as far). */
  nudge: number;
  tour: Array<[number, number]>;
  /** Seconds for the drawn value to ease to where the hand put it. */
  follow?: number;
  /** True while something keeps moving on its own (wheels turning), so frames keep coming. */
  moving?: (value: number) => boolean;
  /** Draws the figure at this value; `dt` and `calm` drive anything that moves on its own. */
  draw: (root: HTMLElement, value: number, dt: number, calm: boolean) => void;
  /** Maps a pointer across the drawing (0 at its left edge, 1 at its right) to a value. */
  fromPointer: (share: number) => number;
  readout: (value: number) => string;
  spoken: (value: number) => string;
  label: string;
}

/** The control for a one-slider bench. Spread the result onto the figure's root element. */
export function useBench(options: BenchOptions) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const latest = React.useRef(options);
  React.useLayoutEffect(() => {
    latest.current = options;
  });
  const value = React.useRef(options.initial);
  const target = React.useRef(options.initial);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const clock = React.useRef(0);
  const touring = React.useRef(false);
  const user = React.useRef(false);
  const [engaged, setEngaged] = React.useState(false);
  const [idle, setIdle] = React.useState(true);
  const [poke, setPoke] = React.useState(0);

  const draw = React.useCallback(
    (dt: number, calm: boolean) => {
      const node = root.current;
      if (!node) return;
      const o = latest.current;
      o.draw(node, value.current, dt, calm);
      say(o.readout(value.current));
      const now = `${Math.round(value.current * 100) / 100}`;
      if (node.getAttribute("aria-valuenow") !== now) {
        node.setAttribute("aria-valuenow", now);
        node.setAttribute("aria-valuetext", o.spoken(value.current));
      }
    },
    [root, say],
  );

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
      const o = latest.current;
      if (touring.current) {
        clock.current += dt;
        target.current = tourAt(o.tour, clock.current);
      }
      const want = target.current;
      value.current = calm
        ? want
        : value.current + (want - value.current) * (1 - Math.exp(-dt / (o.follow ?? 0.15)));
      if (Math.abs(want - value.current) < (o.max - o.min) * 1e-4) value.current = want;
      draw(dt, calm);
      const moving = !calm && (o.moving?.(value.current) ?? false);
      frame.current =
        !touring.current && value.current === want && !moving ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (next: number) => {
      const o = latest.current;
      touring.current = false;
      target.current = Math.min(o.max, Math.max(o.min, next));
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

  const valueAt = (clientX: number) => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return latest.current.fromPointer((clientX - box.left) / box.width);
  };
  const engage = () => {
    setEngaged(true);
    setIdle(false);
  };
  const wake = () => {
    setIdle(false);
    setPoke((count) => count + 1);
  };

  return {
    ref: root,
    role: "slider" as const,
    tabIndex: 0,
    "aria-label": options.label,
    "aria-valuemin": options.min,
    "aria-valuemax": options.max,
    "aria-valuenow": options.initial,
    "aria-valuetext": options.spoken(options.initial),
    onPointerEnter: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse") engage();
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const next = valueAt(event.clientX);
      if (next === null) return;
      if (event.pointerType === "mouse" || user.current) {
        wake();
        steer(next);
      }
    },
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      const next = valueAt(event.clientX);
      if (next === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      user.current = true;
      engage();
      wake();
      steer(next);
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      user.current = false;
      if (event.pointerType !== "mouse") setEngaged(false);
    },
    onPointerCancel: () => {
      user.current = false;
      setEngaged(false);
    },
    onPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && !user.current) setEngaged(false);
    },
    onFocus: engage,
    onBlur: () => setEngaged(false),
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      const o = latest.current;
      const by = event.shiftKey ? o.nudge * 4 : o.nudge;
      let next: number | null = null;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target.current + by;
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target.current - by;
      else if (event.key === "Home") next = o.min;
      else if (event.key === "End") next = o.max;
      else if (event.key === "0" || event.key === "Escape") next = o.initial;
      if (next === null) return;
      event.preventDefault();
      wake();
      steer(next);
    },
  };
}

/** Classes every bench root shares: a slider you drag across, that never selects text. */
export const BENCH_CLASS =
  "cursor-ew-resize touch-pan-y select-none rounded-lg [-webkit-tap-highlight-color:transparent] [&_.iso-svg]:overflow-visible";
