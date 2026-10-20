"use client";

import { Hand } from "lucide-react";
import { useAnimationFrame, useInView, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Point = readonly [number, number];
type Placed = readonly [number, number, number]; // x, y, rotation

const PARTS = [
  { id: "tx", name: "Transmitter" },
  { id: "rx", name: "Receiver" },
  { id: "servo", name: "Servo" },
  { id: "esc", name: "Speed controller" },
  { id: "motor", name: "Motor" },
  { id: "battery", name: "Battery" },
] as const;
type PartId = (typeof PARTS)[number]["id"];

// Where things plug in, in each part's own drawing coordinates.
const TX = { antenna: [263, -74] as Point, left: [76, 116] as Point, right: [204, 116] as Point };
const GIMBAL = 48; // radius of the stick's well
const TRAVEL = 30; // how far a stick tip moves from centre
const RX = { aerial: [-30, -8] as Point, ch1: [100, 20] as Point, ch3: [100, 42] as Point };
const SERVO = { lead: [0, 60] as Point, pivot: [48, 40] as Point };
const ESC = { signal: [0, 12] as Point, battery: [-62, 38] as Point, motor: [150, 27] as Point };
const BATTERY = { lead: [230, 30] as Point };
const HORN = 45; // degrees either side
const MAX_RPM = 11_100; // a 1000 KV motor on a 3S pack

interface Layout {
  width: number;
  height: number;
  at: Record<PartId, Point>;
  prop: number;
  /** Where the motor wires enter, from the motor's centre. */
  motorPort: Point;
  /** Cable handles: how each cable leaves its start and arrives at its end. */
  bends: Record<"air" | "servo" | "esc" | "battery" | "motor", readonly [Point, Point]>;
  /** Masking-tape labels on wide screens, number badges on narrow ones. */
  tapes: boolean;
  labels: Record<PartId, Placed>;
}

const WIDE: Layout = {
  width: 1200,
  height: 600,
  at: {
    tx: [60, 200],
    rx: [480, 200],
    servo: [720, 80],
    esc: [730, 330],
    motor: [1030, 357],
    battery: [410, 420],
  },
  prop: 140,
  motorPort: [-52, 0],
  bends: {
    air: [
      [60, 10],
      [-60, -10],
    ],
    servo: [
      [70, 0],
      [-70, 0],
    ],
    esc: [
      [70, 0],
      [-70, 0],
    ],
    battery: [
      [50, 0],
      [-50, 0],
    ],
    motor: [
      [30, 0],
      [-30, 0],
    ],
  },
  tapes: true,
  labels: {
    tx: [119, 420, -2],
    rx: [463, 285, 2],
    servo: [905, 96, 2],
    esc: [690, 412, -2],
    motor: [977, 522, 1],
    battery: [462, 532, 1],
  },
};

const NARROW: Layout = {
  width: 420,
  height: 880,
  at: {
    tx: [70, 100],
    rx: [40, 380],
    servo: [250, 360],
    esc: [230, 540],
    motor: [320, 770],
    battery: [16, 620],
  },
  prop: 90,
  motorPort: [0, -52],
  bends: {
    // round the transmitter's left side instead of passing under it
    air: [
      [-200, -40],
      [-70, -222],
    ],
    servo: [
      [45, 0],
      [-45, 0],
    ],
    esc: [
      [50, 0],
      [-50, 0],
    ],
    battery: [
      [30, -20],
      [-40, 0],
    ],
    motor: [
      [40, 0],
      [0, -50],
    ],
  },
  tapes: false,
  labels: {
    tx: [72, 104, 0],
    rx: [40, 380, 0],
    servo: [402, 362, 0],
    esc: [230, 540, 0],
    motor: [262, 832, 0],
    battery: [18, 622, 0],
  },
};

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
/** A cable lying on the mat, as a cubic from a to b. */
const cable = (a: Point, b: Point, [ha, hb]: readonly [Point, Point]) =>
  `M ${a.join(" ")} C ${add(a, ha).join(" ")} ${add(b, hb).join(" ")} ${b.join(" ")}`;
const pct = (value: number, of: number) => `${(value / of) * 100}%`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const WIDE_QUERY = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useWide = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );

const START = { throttle: 0.45, steering: 0 };
const STEPS: Record<string, number | undefined> = {
  ArrowUp: 0.1,
  ArrowRight: 0.1,
  ArrowDown: -0.1,
  ArrowLeft: -0.1,
};

const describe = {
  power: (throttle: number) => `${Math.round(throttle * 100)}%`,
  horn: (steering: number) => {
    const angle = Math.round(steering * HORN);
    return angle === 0 ? "centre" : `${Math.abs(angle)}° ${angle > 0 ? "right" : "left"}`;
  },
  rpm: (throttle: number) =>
    `${(Math.round((throttle * MAX_RPM) / 100) * 100).toLocaleString("en-US")} rpm`,
};

/**
 * The home page's "how does it work" bench: the six parts of any RC model laid out on
 * the cutting mat and wired up. The transmitter's sticks drive the servo and the motor.
 */
export function SignalBench() {
  const wide = useWide();
  const layout = wide ? WIDE : NARROW;
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { margin: "120px" });
  const [touched, setTouched] = useState(false);

  // Live values are written straight to the drawing every frame, outside React.
  const value = useRef({ ...START });
  const anim = useRef({ spin: 0, signal: 0, power: 0, demo: true, holding: false });
  const grab = useRef<"throttle" | "steering" | null>(null);

  const draw = (time: number) => {
    const node = root.current;
    if (!node) return;
    const one = (name: string) => node.querySelector(`[data-bench="${name}"]`);
    const all = (name: string) => node.querySelectorAll(`[data-bench="${name}"]`);
    const { throttle, steering } = value.current;
    const m = anim.current;

    const leftY = TX.left[1] + TRAVEL - 2 * TRAVEL * throttle;
    one("knob-left")?.setAttribute("cy", `${leftY}`);
    one("stick-left")?.setAttribute("y2", `${leftY}`);
    const rightX = TX.right[0] + TRAVEL * steering;
    one("knob-right")?.setAttribute("cx", `${rightX}`);
    one("stick-right")?.setAttribute("x2", `${rightX}`);
    one("bar-throttle")?.setAttribute("width", `${throttle * 56}`);
    one("bar-steer")?.setAttribute("x", `${140 + Math.min(0, steering) * 28}`);
    one("bar-steer")?.setAttribute("width", `${Math.abs(steering) * 28}`);

    one("horn")?.setAttribute(
      "transform",
      `rotate(${steering * HORN} ${SERVO.pivot[0]} ${SERVO.pivot[1]})`,
    );
    one("prop")?.setAttribute("transform", `rotate(${m.spin})`);
    one("disc")?.setAttribute("opacity", `${throttle * 0.3}`);
    all("signal").forEach((path) => path.setAttribute("stroke-dashoffset", `${m.signal}`));
    all("power").forEach((path) => {
      path.setAttribute("stroke-dashoffset", `${m.power}`);
      path.setAttribute("opacity", `${clamp(throttle * 4, 0, 1)}`);
    });
    all("ripple").forEach((ring, i) => {
      const phase = reduce ? (i + 1) / 4 : (time / 1400 + i / 3) % 1;
      ring.setAttribute("r", `${10 + phase * 70}`);
      ring.setAttribute("opacity", `${(1 - phase) * 0.8}`);
    });

    const out = (name: string, text: string) => {
      const target = one(name);
      if (target && target.textContent !== text) target.textContent = text;
    };
    out("out-power", describe.power(throttle));
    out("out-horn", describe.horn(steering));
    out("out-rpm", describe.rpm(throttle));
    one("slider-throttle")?.setAttribute("aria-valuenow", `${Math.round(throttle * 100)}`);
    one("slider-throttle")?.setAttribute("aria-valuetext", `${describe.power(throttle)} power`);
    one("slider-steering")?.setAttribute("aria-valuenow", `${Math.round(steering * HORN)}`);
    one("slider-steering")?.setAttribute("aria-valuetext", describe.horn(steering));
  };

  useAnimationFrame((time, delta) => {
    if (!inView) return;
    const m = anim.current;
    const v = value.current;
    if (m.demo && !reduce) {
      // Until someone grabs a stick, the bench runs a slow demo of both.
      v.throttle = 0.45 + 0.35 * Math.sin(time / 1500);
      v.steering = 0.8 * Math.sin(time / 950);
    } else if (!m.holding && grab.current !== "steering") {
      // The right stick is sprung: let go and it returns to centre. The throttle stays put.
      v.steering *= Math.exp(-delta / 90);
      if (Math.abs(v.steering) < 0.005) v.steering = 0;
    }
    if (!reduce) {
      m.spin = (m.spin + v.throttle * delta * 2.4) % 360;
      m.signal -= delta * 0.05;
      m.power -= v.throttle * delta * 0.12;
    }
    draw(time);
  });

  useLayoutEffect(() => {
    draw(0);
  });

  const take = () => {
    anim.current.demo = false;
    if (!touched) setTouched(true);
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    if (!grab.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const reach = (box.width / 2) * (TRAVEL / GIMBAL);
    const dx = clamp((event.clientX - (box.left + box.width / 2)) / reach, -1, 1);
    const dy = clamp((event.clientY - (box.top + box.height / 2)) / reach, -1, 1);
    if (grab.current === "throttle") value.current.throttle = (1 - dy) / 2;
    else value.current.steering = dx;
  };

  const stick = (which: "throttle" | "steering") => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      take();
      anim.current.holding = false;
      grab.current = which;
      move(event);
    },
    onPointerMove: move,
    onPointerUp: () => {
      grab.current = null;
    },
    onPointerCancel: () => {
      grab.current = null;
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      const step = STEPS[event.key];
      const v = value.current;
      if (step === undefined && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      take();
      // Keyboard users can't hold a key down forever, so the sprung stick holds too.
      anim.current.holding = true;
      const min = which === "throttle" ? 0 : -1;
      const next =
        event.key === "Home"
          ? min
          : event.key === "End"
            ? 1
            : (which === "throttle" ? v.throttle : v.steering) + (step ?? 0);
      if (which === "throttle") v.throttle = clamp(next, 0, 1);
      else v.steering = clamp(next, -1, 1);
      draw(0);
    },
  });

  const { width: W, height: H, at } = layout;
  const tx = at.tx;
  const port = {
    antenna: add(tx, TX.antenna),
    ch1: add(at.rx, RX.ch1),
    ch3: add(at.rx, RX.ch3),
    aerial: add(at.rx, RX.aerial),
    servo: add(at.servo, SERVO.lead),
    escSignal: add(at.esc, ESC.signal),
    escBattery: add(at.esc, ESC.battery),
    escMotor: add(at.esc, ESC.motor),
    motor: add(at.motor, layout.motorPort),
    battery: add(at.battery, BATTERY.lead),
  };

  return (
    <div ref={root} className="mx-auto mt-6 max-w-6xl">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="An RC setup on a workbench. The transmitter sends a radio signal to the receiver, which drives a servo and a speed controller. The speed controller takes power from the battery and feeds the motor, which spins the propeller."
          className="block h-auto w-full overflow-visible"
        >
          <defs>
            <filter id="bench-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="5"
                dy="6"
                stdDeviation="0"
                style={{ floodColor: "var(--foreground)", floodOpacity: 0.3 }}
              />
            </filter>
          </defs>

          {/* the radio link, through the air */}
          <path
            data-bench="signal"
            d={cable(port.antenna, port.aerial, layout.bends.air)}
            fill="none"
            stroke="var(--mat-foreground)"
            strokeWidth={3}
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              data-bench="ripple"
              cx={port.antenna[0]}
              cy={port.antenna[1]}
              r={10}
              fill="none"
              stroke="var(--mat-foreground)"
              strokeWidth={3}
              opacity={0}
            />
          ))}

          <g filter="url(#bench-shadow)">
            <Cable d={cable(port.ch1, port.servo, layout.bends.servo)} flow="signal" />
            <Cable d={cable(port.ch3, port.escSignal, layout.bends.esc)} flow="signal" />
            <Cable d={cable(port.battery, port.escBattery, layout.bends.battery)} flow="power" />
            <Cable d={cable(port.escMotor, port.motor, layout.bends.motor)} flow="power" />

            <Battery at={at.battery} />
            <Receiver at={at.rx} />
            <Servo at={at.servo} />
            <SpeedController at={at.esc} />
            <Transmitter at={tx} />
            <Motor at={at.motor} prop={layout.prop} />
          </g>

          {PARTS.map((part, index) =>
            layout.tapes ? (
              <Tape key={part.id} place={layout.labels[part.id]} n={index + 1} {...part} />
            ) : (
              <Badge key={part.id} place={layout.labels[part.id]} n={index + 1} />
            ),
          )}
        </svg>

        {/* The two sticks, as real sliders over the drawing */}
        {(
          [
            ["throttle", TX.left, "Left stick, power", "vertical", 0, 100],
            ["steering", TX.right, "Right stick, steering", "horizontal", -HORN, HORN],
          ] as const
        ).map(([which, centre, label, orientation, min, max]) => (
          <div
            key={which}
            role="slider"
            tabIndex={0}
            data-bench={`slider-${which}`}
            aria-label={label}
            aria-orientation={orientation}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={which === "throttle" ? START.throttle * 100 : 0}
            aria-valuetext={
              which === "throttle"
                ? `${describe.power(START.throttle)} power`
                : describe.horn(START.steering)
            }
            className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full active:cursor-grabbing"
            style={{
              left: pct(tx[0] + centre[0], W),
              top: pct(tx[1] + centre[1], H),
              width: pct(GIMBAL * 2, W),
            }}
            {...stick(which)}
          />
        ))}

        <p
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute flex -translate-y-full -rotate-3 items-center gap-1.5 rounded-md border-2 border-foreground bg-primary px-2.5 py-1 text-sm font-bold whitespace-nowrap text-foreground shadow-hard-sm transition-opacity duration-300",
            touched && "opacity-0",
          )}
          style={{ left: pct(tx[0] + 24, W), top: pct(tx[1] - 14, H) }}
        >
          <Hand aria-hidden="true" className="size-4" strokeWidth={2.5} />
          Drag the sticks
        </p>
      </div>

      {/* On narrow screens the numbers on the drawing point here. */}
      <ol className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-x-4 gap-y-3 md:hidden">
        {PARTS.map((part, index) => (
          <li key={part.id} className="flex items-center gap-2 font-bold">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-black text-primary">
              {index + 1}
            </span>
            {part.name}
          </li>
        ))}
      </ol>

      {/* A transmitter-style screen: one readout, three equal cells */}
      <dl className="mx-auto mt-10 grid w-full max-w-md grid-cols-3 rounded-xl bg-foreground py-3 text-center">
        {(
          [
            ["Power", "out-power", describe.power(START.throttle)],
            ["Servo", "out-horn", describe.horn(START.steering)],
            ["Motor", "out-rpm", describe.rpm(START.throttle)],
          ] as const
        ).map(([term, name, initial]) => (
          <div key={name} className="grid gap-0.5 px-2">
            <dt className="text-xs font-semibold tracking-wide text-mat-foreground/70 uppercase">
              {term}
            </dt>
            <dd data-bench={name} className="font-bold text-primary tabular-nums sm:text-lg">
              {initial}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Cable({ d, flow }: { d: string; flow: "signal" | "power" }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="var(--foreground)" strokeWidth={flow === "power" ? 10 : 6} />
      {/* what travels down it: commands, or current */}
      <path
        data-bench={flow}
        d={d}
        stroke={flow === "power" ? "var(--primary)" : "var(--panel)"}
        strokeWidth={flow === "power" ? 4 : 2.5}
        strokeDasharray={flow === "power" ? "14 22" : "4 14"}
      />
    </g>
  );
}

function Transmitter({ at }: { at: Point }) {
  const [lx, ly] = TX.left;
  const [rx, ry] = TX.right;
  const throttleY = ly + TRAVEL - 2 * TRAVEL * START.throttle;
  return (
    <g transform={`translate(${at.join(" ")})`}>
      <rect
        x={-7}
        y={-88}
        width={14}
        height={94}
        rx={7}
        fill="var(--foreground)"
        transform="translate(236 10) rotate(18)"
      />
      <rect width={280} height={190} rx={36} fill="var(--foreground)" />
      {[34, 60].map((x) => (
        <g key={x}>
          <rect x={x - 8} y={16} width={16} height={24} rx={4} fill="var(--muted-foreground)" />
          <circle cx={x} cy={22} r={5} fill="var(--panel)" />
        </g>
      ))}
      {/* the screen shows one bar per channel */}
      <rect x={104} y={20} width={72} height={38} rx={4} fill="var(--mat)" />
      <rect
        data-bench="bar-steer"
        x={140}
        y={28}
        width={0}
        height={7}
        fill="var(--mat-foreground)"
      />
      <rect
        data-bench="bar-throttle"
        x={112}
        y={43}
        width={START.throttle * 56}
        height={7}
        fill="var(--mat-foreground)"
      />
      {[TX.left, TX.right].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={GIMBAL} fill="var(--muted-foreground)" />
          <path
            d={`M ${x - 36} ${y} H ${x + 36} M ${x} ${y - 36} V ${y + 36}`}
            stroke="var(--foreground)"
            strokeWidth={2}
            opacity={0.45}
          />
        </g>
      ))}
      <line
        data-bench="stick-left"
        x1={lx}
        y1={ly}
        x2={lx}
        y2={throttleY}
        stroke="var(--panel)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle
        data-bench="knob-left"
        cx={lx}
        cy={throttleY}
        r={16}
        fill="var(--primary)"
        stroke="var(--foreground)"
        strokeWidth={3}
      />
      <line
        data-bench="stick-right"
        x1={rx}
        y1={ry}
        x2={rx}
        y2={ry}
        stroke="var(--panel)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle
        data-bench="knob-right"
        cx={rx}
        cy={ry}
        r={16}
        fill="var(--primary)"
        stroke="var(--foreground)"
        strokeWidth={3}
      />
      <circle cx={140} cy={168} r={6} fill="var(--primary)" />
    </g>
  );
}

function Receiver({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at.join(" ")})`}>
      {/* two aerials, with the bare tips that actually do the listening */}
      {(
        [
          [0, 14, -30, -8],
          [0, 44, -34, 62],
        ] as const
      ).map(([x1, y1, x2, y2]) => (
        <g key={y1} strokeLinecap="round" strokeWidth={3.5}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--foreground)" />
          <line
            x1={x2 + (x1 - x2) * 0.3}
            y1={y2 + (y1 - y2) * 0.3}
            x2={x2}
            y2={y2}
            stroke="var(--panel)"
          />
        </g>
      ))}
      <rect width={100} height={60} rx={8} fill="var(--foreground)" />
      <rect x={10} y={12} width={44} height={36} rx={3} fill="var(--panel)" />
      <text
        x={32}
        y={35}
        textAnchor="middle"
        fontSize={14}
        fontWeight={900}
        fill="var(--foreground)"
        style={{ fontStretch: "125%" }}
      >
        RX
      </text>
      <rect x={64} y={8} width={28} height={44} rx={2} fill="var(--muted-foreground)" />
      {[0, 1, 2].flatMap((col) =>
        [0, 1, 2, 3].map((row) => (
          <circle
            key={`${col}-${row}`}
            cx={70 + col * 8}
            cy={15 + row * 10}
            r={2}
            fill="var(--panel)"
          />
        )),
      )}
    </g>
  );
}

function Servo({ at }: { at: Point }) {
  const [px, py] = SERVO.pivot;
  return (
    <g transform={`translate(${at.join(" ")})`}>
      <rect x={-22} y={24} width={194} height={32} rx={6} fill="var(--foreground)" />
      {[-11, 161].map((x) => (
        <circle key={x} cx={x} cy={40} r={5} fill="var(--mat)" />
      ))}
      <rect width={150} height={80} rx={10} fill="var(--foreground)" />
      <circle cx={px} cy={py} r={22} fill="var(--muted-foreground)" />
      <g data-bench="horn" transform={`rotate(0 ${px} ${py})`}>
        <path
          d={`M ${px - 15} ${py} L ${px - 7} ${py - 74} A 7 7 0 0 1 ${px + 7} ${py - 74} L ${px + 15} ${py} A 15 15 0 0 1 ${px - 15} ${py} Z`}
          fill="var(--primary)"
          stroke="var(--foreground)"
          strokeWidth={3}
        />
        {[26, 42, 58].map((d) => (
          <circle key={d} cx={px} cy={py - d} r={3.5} fill="var(--foreground)" />
        ))}
        <circle cx={px} cy={py} r={7} fill="var(--foreground)" />
        <circle cx={px} cy={py} r={2.5} fill="var(--panel)" />
      </g>
    </g>
  );
}

function SpeedController({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at.join(" ")})`}>
      <path d="M 0 38 H -8" stroke="var(--foreground)" strokeWidth={8} />
      {/* the XT60, the yellow plug every LiPo ends in */}
      <rect
        x={-62}
        y={28}
        width={56}
        height={20}
        rx={4}
        fill="var(--primary)"
        stroke="var(--foreground)"
        strokeWidth={2.5}
      />
      <path d="M -34 28 V 48" stroke="var(--foreground)" strokeWidth={2.5} />
      <rect width={150} height={54} rx={16} fill="var(--foreground)" />
      <rect x={38} y={15} width={74} height={24} rx={3} fill="var(--panel)" />
      <text
        x={75}
        y={32}
        textAnchor="middle"
        fontSize={13}
        fontWeight={900}
        fill="var(--foreground)"
        style={{ fontStretch: "125%" }}
      >
        40 A
      </text>
    </g>
  );
}

function Motor({ at, prop }: { at: Point; prop: number }) {
  const blade = `M 0 -9 C ${prop * 0.35} -16 ${prop * 0.8} -10 ${prop} -3 L ${prop} 3 C ${prop * 0.8} 8 ${prop * 0.35} 12 0 9 Z`;
  return (
    <g transform={`translate(${at.join(" ")})`}>
      <circle r={52} fill="var(--foreground)" />
      <circle r={40} fill="none" stroke="var(--muted-foreground)" strokeWidth={5} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <circle
          key={a}
          cx={Math.round(Math.cos((a * Math.PI) / 180) * 2600) / 100}
          cy={Math.round(Math.sin((a * Math.PI) / 180) * 2600) / 100}
          r={5}
          fill="var(--muted-foreground)"
        />
      ))}
      {/* the blur a spinning prop leaves */}
      <circle data-bench="disc" r={prop} fill="var(--panel)" opacity={START.throttle * 0.3} />
      <g data-bench="prop">
        {[0, 180].map((a) => (
          <path
            key={a}
            d={blade}
            transform={`rotate(${a})`}
            fill="var(--panel)"
            stroke="var(--foreground)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <circle r={13} fill="var(--primary)" stroke="var(--foreground)" strokeWidth={3} />
    </g>
  );
}

function Battery({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at.join(" ")})`}>
      {/* balance lead */}
      <path d="M 226 70 H 246" stroke="var(--foreground)" strokeWidth={4} />
      <rect
        x={244}
        y={62}
        width={20}
        height={16}
        rx={2}
        fill="var(--panel)"
        stroke="var(--foreground)"
        strokeWidth={2}
      />
      <rect width={230} height={92} rx={10} fill="var(--foreground)" />
      <rect x={14} y={14} width={170} height={64} rx={3} fill="var(--panel)" />
      <rect x={14} y={14} width={12} height={64} fill="var(--primary)" />
      <text
        x={38}
        y={55}
        fontSize={24}
        fontWeight={900}
        fill="var(--foreground)"
        style={{ fontStretch: "125%" }}
      >
        LiPo
      </text>
    </g>
  );
}

const TAPE = { h: 38, tooth: 5, steps: 6 };
/** A strip of masking tape, torn at both ends. */
const tapePath = (w: number) => {
  const { h, tooth, steps } = TAPE;
  const right = Array.from(
    { length: steps },
    (_, i) => `L ${i % 2 === 0 ? w - tooth : w} ${((i + 1) * h) / steps}`,
  );
  const left = Array.from(
    { length: steps },
    (_, i) => `L ${i % 2 === 0 ? tooth : 0} ${h - ((i + 1) * h) / steps}`,
  );
  return `M 0 0 H ${w} ${right.join(" ")} H 0 ${left.join(" ")} Z`;
};

function Tape({ place: [x, y, rotation], n, name }: { place: Placed; n: number; name: string }) {
  // Wide-cut Archivo at this size runs about 9.3 units a letter.
  const width = Math.round(60 + name.length * 9.3);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
      <path d={tapePath(width)} fill="var(--panel)" fillOpacity={0.94} />
      <circle cx={22} cy={19} r={11} fill="var(--foreground)" />
      <text x={22} y={24} textAnchor="middle" fontSize={13} fontWeight={900} fill="var(--primary)">
        {n}
      </text>
      <text
        x={42}
        y={25}
        fontSize={16}
        fontWeight={900}
        fill="var(--foreground)"
        style={{ fontStretch: "125%" }}
      >
        {name}
      </text>
    </g>
  );
}

function Badge({ place: [x, y], n }: { place: Placed; n: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={17} fill="var(--foreground)" stroke="var(--panel)" strokeWidth={3} />
      <text y={6} textAnchor="middle" fontSize={17} fontWeight={900} fill="var(--primary)">
        {n}
      </text>
    </g>
  );
}
