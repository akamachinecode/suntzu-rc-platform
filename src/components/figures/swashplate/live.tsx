"use client";

import * as React from "react";
import { IsoFigure } from "@/components/iso/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/iso/react/live";
import { LiveSolid, paint } from "../live-solid";
import { headOf, type HeadFrame } from "./frame";
import { SERVO_ANGLES, readoutOf, spokenOf, type Input } from "./model";
import { HEIGHT, WIDTH } from "./view";

const TURN_SPEED = 72; // degrees a second: far slower than the real head, like a strobe
const STILL_TURN = 24;
const EASE = 0.14; // the sticks easing to where you put them
const NUDGE = 0.1;
const TOUR_FIRST = 1200;
const TOUR_BACK = 3600;
const LONGEST_FRAME = 1 / 30;

/** The idle tour: collective up and down, then cyclic forward and back. */
const TOUR: Array<[number, number, number]> = [
  [0, 0, 0],
  [1.5, 0, 0],
  [3, 0.8, 0],
  [5, 0.8, 0],
  [6.5, -0.6, 0],
  [8.5, -0.6, 0],
  [10, 0.3, 0],
  [11, 0.3, 0],
  [12.5, 0.3, 1],
  [15.5, 0.3, 1],
  [17, 0.3, -1],
  [20, 0.3, -1],
  [21.5, 0, 0],
  [23, 0, 0],
];
const TOUR_LENGTH = TOUR.at(-1)![0];

function tourAt(time: number): Input {
  const t = time % TOUR_LENGTH;
  for (let index = 1; index < TOUR.length; index++) {
    const [t1, c1, y1] = TOUR[index]!;
    const [t0, c0, y0] = TOUR[index - 1]!;
    if (t <= t1) {
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      const s = u * u * (3 - 2 * u);
      return { collective: c0 + (c1 - c0) * s, cyclic: y0 + (y1 - y0) * s };
    }
  }
  return { collective: 0, cyclic: 0 };
}

const clamp = (value: number) => Math.min(1, Math.max(-1, value));
const START = headOf({ collective: 0, cyclic: 0 }, STILL_TURN);

function apply(root: HTMLElement, f: HeadFrame) {
  const one = (name: string) => root.querySelector(`[data-node="${name}"]`);
  SERVO_ANGLES.forEach((angle, index) => {
    paint(one(`arm-${angle}`), f.arms[index]!);
    paint(one(`link-${angle}`), f.links[index]!);
    paint(one(`lower-ball-${angle}`), f.lowerBalls[index]!);
  });
  paint(one("lower"), f.lower);
  paint(one("pin"), f.pin);
  paint(one("upper"), f.upper);
  paint(one("hub"), f.hub);
  paint(one("spindle"), f.spindle);
  f.blades.forEach((blade, index) => {
    const side = index === 0 ? "back" : "front";
    paint(one(`ball-under-${side}`), blade.ballBehind ? blade.ball : null);
    paint(one(`link-under-${side}`), blade.ballBehind ? blade.link : null);
    paint(one(`ball-over-${side}`), blade.ballBehind ? null : blade.ball);
    paint(one(`link-over-${side}`), blade.ballBehind ? null : blade.link);
    paint(one(`blade-${side}`), blade.blade);
    paint(one(`grip-${side}`), blade.grip);
    paint(one(`arm-${side}`), blade.arm);
    paint(one(`arm-ball-${side}`), blade.armBall);
    const bolt = one(`bolt-${side}`);
    bolt?.setAttribute("cx", `${blade.bolt[0]}`);
    bolt?.setAttribute("cy", `${blade.bolt[1]}`);
  });
}

function ServoMoving({ angle }: { angle: number }) {
  const index = SERVO_ANGLES.indexOf(angle as (typeof SERVO_ANGLES)[number]);
  return (
    <>
      <LiveSolid node={`arm-${angle}`} paths={START.arms[index]} crease="none" />
      <LiveSolid node={`link-${angle}`} paths={START.links[index]} tone="mid" crease="none" />
    </>
  );
}

function BladeGroup({ side }: { side: "back" | "front" }) {
  const blade = START.blades[side === "back" ? 0 : 1];
  return (
    <>
      <LiveSolid node={`blade-${side}`} paths={blade.blade} lit />
      <LiveSolid node={`grip-${side}`} paths={blade.grip} />
      <LiveSolid node={`arm-${side}`} paths={blade.arm} tone="mid" crease="none" />
      <LiveSolid node={`arm-ball-${side}`} paths={blade.armBall} tone="mid" crease="none" />
      <g className="iso-dots" data-tone="mid">
        <circle data-node={`bolt-${side}`} cx={blade.bolt[0]} cy={blade.bolt[1]} r={0.6} />
      </g>
    </>
  );
}

function PitchLink({ side, over }: { side: "back" | "front"; over: boolean }) {
  const blade = START.blades[side === "back" ? 0 : 1];
  const show = over ? !blade.ballBehind : blade.ballBehind;
  const where = over ? "over" : "under";
  return (
    <>
      <LiveSolid
        node={`link-${where}-${side}`}
        paths={show ? blade.link : undefined}
        tone="mid"
        crease="none"
      />
      <LiveSolid
        node={`ball-${where}-${side}`}
        paths={show ? blade.ball : undefined}
        tone="mid"
        crease="none"
      />
    </>
  );
}

export function SwashplateLive({
  label,
  bench,
  back,
  backAngles,
  post,
  button,
  front,
  frontAngles,
}: {
  label: string;
  bench: React.ReactNode;
  back: React.ReactNode[];
  backAngles: number[];
  post: React.ReactNode;
  button: React.ReactNode;
  front: React.ReactNode[];
  frontAngles: number[];
}) {
  const { anchor: root, say } = useReadout<HTMLDivElement>();
  const visible = useInView(root);
  const input = React.useRef<Input>({ collective: 0, cyclic: 0 });
  const target = React.useRef<Input>({ collective: 0, cyclic: 0 });
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
    apply(node, headOf(input.current, turn.current));
    say(readoutOf(input.current));
    // Spoken once the plate has arrived, not on every frame of the way there.
    const arrived =
      Math.abs(input.current.collective - target.current.collective) < 0.01 &&
      Math.abs(input.current.cyclic - target.current.cyclic) < 0.01;
    const status = node.querySelector("[data-status]");
    const text = spokenOf(target.current);
    if (arrived && status && status.textContent !== text) status.textContent = text;
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
      const k = calm ? 1 : 1 - Math.exp(-dt / EASE);
      const want = target.current;
      input.current = {
        collective: input.current.collective + (want.collective - input.current.collective) * k,
        cyclic: input.current.cyclic + (want.cyclic - input.current.cyclic) * k,
      };
      if (!calm) turn.current = (turn.current + TURN_SPEED * dt) % 360;
      draw();
      // The head keeps turning while the figure is on screen; under reduced motion it rests.
      const settled =
        calm &&
        Math.abs(want.collective - input.current.collective) < 1e-3 &&
        Math.abs(want.cyclic - input.current.cyclic) < 1e-3;
      frame.current = settled ? 0 : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [draw]);

  const steer = React.useCallback(
    (next: Partial<Input>) => {
      touring.current = false;
      target.current = {
        collective: clamp(next.collective ?? target.current.collective),
        cyclic: clamp(next.cyclic ?? target.current.cyclic),
      };
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

  const inputAt = (clientX: number, clientY: number): Input | null => {
    const box = root.current?.querySelector("svg")?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return {
      cyclic: clamp((((clientX - box.left) / box.width) * 2 - 1) * 1.4),
      collective: clamp((1 - ((clientY - box.top) / box.height) * 2) * 1.4),
    };
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
      className="swp cursor-crosshair touch-pan-y rounded-lg select-none [-webkit-tap-highlight-color:transparent] [&_.iso-svg]:overflow-visible"
      role="group"
      tabIndex={0}
      aria-label="Swashplate bench. Left and right arrow keys tilt the swashplate forward and back; up and down raise and lower it."
      aria-roledescription="bench"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") engage();
      }}
      onPointerMove={(event) => {
        const next = inputAt(event.clientX, event.clientY);
        if (!next) return;
        if (event.pointerType === "mouse" || user.current) {
          wake();
          steer(next);
        }
      }}
      onPointerDown={(event) => {
        const next = inputAt(event.clientX, event.clientY);
        if (!next) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        user.current = true;
        engage();
        wake();
        steer(next);
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
        const now = target.current;
        let next: Partial<Input> | null = null;
        if (event.key === "ArrowRight") next = { cyclic: now.cyclic + by };
        else if (event.key === "ArrowLeft") next = { cyclic: now.cyclic - by };
        else if (event.key === "ArrowUp") next = { collective: now.collective + by };
        else if (event.key === "ArrowDown") next = { collective: now.collective - by };
        else if (event.key === "0" || event.key === "Escape") next = { collective: 0, cyclic: 0 };
        if (next === null) return;
        event.preventDefault();
        wake();
        steer(next);
      }}
    >
      <p data-status="" className="sr-only" aria-live="polite">
        {spokenOf({ collective: 0, cyclic: 0 })}
      </p>
      <IsoFigure width={WIDTH} height={HEIGHT} label={label}>
        {bench}
        {back.map((servo, index) => (
          <g key={backAngles[index]}>
            {servo}
            <ServoMoving angle={backAngles[index]!} />
          </g>
        ))}
        {SERVO_ANGLES.map((angle, index) =>
          START.lowerBalls[index] && backAngles.includes(angle) ? (
            <LiveSolid
              key={angle}
              node={`lower-ball-${angle}`}
              paths={START.lowerBalls[index]}
              tone="mid"
              crease="none"
            />
          ) : null,
        )}
        <PitchLink side="back" over={false} />
        <PitchLink side="front" over={false} />
        <LiveSolid node="lower" paths={START.lower} crease="none" />
        <LiveSolid node="pin" paths={START.pin} tone="mid" crease="none" />
        {SERVO_ANGLES.map((angle, index) =>
          !backAngles.includes(angle) ? (
            <LiveSolid
              key={angle}
              node={`lower-ball-${angle}`}
              paths={START.lowerBalls[index]}
              tone="mid"
              crease="none"
            />
          ) : null,
        )}
        <LiveSolid node="upper" paths={START.upper} crease="none" />
        <PitchLink side="back" over />
        <PitchLink side="front" over />
        {post}
        <BladeGroup side="back" />
        <LiveSolid node="spindle" paths={START.spindle} tone="mid" crease="none" />
        <LiveSolid node="hub" paths={START.hub} />
        {button}
        <BladeGroup side="front" />
        {front.map((servo, index) => (
          <g key={frontAngles[index]}>
            {servo}
            <ServoMoving angle={frontAngles[index]!} />
          </g>
        ))}
      </IsoFigure>
    </div>
  );
}
