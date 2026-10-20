"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

// A standard servo reads a pulse every 20 ms: 1000 µs is one end, 2000 µs the other.
const PULSE_MIN = 1000;
const PULSE_MAX = 2000;
const TRAVEL = 45; // degrees either side of centre
const PIVOT = { x: 250, y: 262 };

/** The page's scroll position is the radio signal: scrolling sweeps the servo horn end to end. */
export function ServoHero() {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  const pulse = useTransform(scrollYProgress, [0, 1], [PULSE_MIN, PULSE_MAX]);
  const angle = useTransform(pulse, [PULSE_MIN, PULSE_MAX], [-TRAVEL, TRAVEL]);
  const horn = useRef<SVGGElement>(null);
  // SVG rotation needs a pivot, so the attribute is written directly rather than via style.
  const rotateHorn = (a: number) =>
    horn.current?.setAttribute("transform", `rotate(${a} ${PIVOT.x} ${PIVOT.y})`);
  useMotionValueEvent(angle, "change", rotateHorn);
  useEffect(() => {
    rotateHorn(angle.get());
  });
  const pulseText = useTransform(pulse, (p) => Math.round(p).toString());
  const angleText = useTransform(angle, (a) => `${a > 0.5 ? "+" : ""}${Math.round(a)}°`);
  // Waveform window shows the first 3 ms of the frame: 100 px per millisecond.
  const wave = useTransform(pulse, (p) => {
    const fall = 20 + (p / 1000) * 100;
    return `M 0 70 H 20 V 14 H ${fall} V 70 H 320`;
  });

  return (
    <section ref={track} aria-labelledby="hero-title" className="relative h-[260vh]">
      <div className="sticky top-16 mx-auto grid h-[calc(100dvh-4rem)] max-w-7xl content-center gap-8 px-4 py-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12">
        <div className="flex flex-col items-start gap-5 md:gap-7">
          <h1
            id="hero-title"
            className="text-[2.6rem] leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          >
            Small machines. Serious engineering.
          </h1>
          <p className="max-w-[46ch] text-base text-pretty sm:text-lg">
            Three RC fans in South Florida. We teach you to fly, hover and drive, connect you with
            the local scene, and take the machines apart so you can see how they work.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/learn">Learn with us</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="max-sm:hidden">
              <Link href="/guides/rc-planes">The RC plane, taken apart</Link>
            </Button>
          </div>
        </div>

        <figure className="rounded-xl border-2 border-foreground bg-panel shadow-hard-lg">
          <svg
            viewBox="0 0 500 380"
            role="img"
            aria-label="A standard servo seen from above. Its output horn turns as the page scrolls."
            className="block h-auto max-h-[38dvh] w-full md:max-h-[46dvh]"
          >
            {/* mounting tabs */}
            <rect x="70" y="240" width="360" height="56" rx="8" fill="#000" />
            <circle cx="96" cy="268" r="9" fill="var(--panel)" />
            <circle cx="404" cy="268" r="9" fill="var(--panel)" />
            {/* case */}
            <rect x="120" y="196" width="260" height="146" rx="14" fill="#000" />
            <rect x="140" y="300" width="104" height="26" rx="4" fill="var(--primary)" />
            <text
              x="192"
              y="319"
              textAnchor="middle"
              fontSize="17"
              fontWeight="900"
              style={{ fontStretch: "125%" }}
            >
              servo
            </text>
            {/* output spline boss */}
            <circle cx={PIVOT.x} cy={PIVOT.y} r="40" fill="#3a3a37" />
            {/* horn */}
            <g ref={horn} transform={`rotate(${-TRAVEL} ${PIVOT.x} ${PIVOT.y})`}>
              <path
                d={`M ${PIVOT.x - 30} ${PIVOT.y} L ${PIVOT.x - 13} ${PIVOT.y - 186} A 13 13 0 0 1 ${PIVOT.x + 13} ${PIVOT.y - 186} L ${PIVOT.x + 30} ${PIVOT.y} A 30 30 0 0 1 ${PIVOT.x - 30} ${PIVOT.y} Z`}
                fill="var(--primary)"
                stroke="#000"
                strokeWidth="4"
              />
              {[52, 82, 112, 142, 172].map((d) => (
                <circle key={d} cx={PIVOT.x} cy={PIVOT.y - d} r="5.5" fill="#000" />
              ))}
              <circle cx={PIVOT.x} cy={PIVOT.y} r="13" fill="#000" />
              <circle cx={PIVOT.x} cy={PIVOT.y} r="5" fill="var(--panel)" />
            </g>
          </svg>

          <figcaption className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 border-t-2 border-foreground p-4 sm:p-5">
            <dl className="grid gap-1 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="w-12 text-muted-foreground">Signal</dt>
                <dd className="text-2xl font-bold tabular-nums">
                  <motion.span>{pulseText}</motion.span>
                  <span className="text-base font-semibold"> µs</span>
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="w-12 text-muted-foreground">Horn</dt>
                <dd className="text-2xl font-bold tabular-nums">
                  <motion.span>{angleText}</motion.span>
                </dd>
              </div>
            </dl>
            <svg viewBox="0 0 320 84" aria-hidden="true" className="h-16 w-full">
              {[120, 170, 220].map((x) => (
                <line key={x} x1={x} x2={x} y1="8" y2="76" stroke="var(--muted)" strokeWidth="2" />
              ))}
              <motion.path
                d={wave}
                fill="none"
                stroke="#000"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <text x="120" y="84" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)">
                1 ms
              </text>
              <text x="220" y="84" textAnchor="middle" fontSize="13" fill="var(--muted-foreground)">
                2 ms
              </text>
            </svg>
            <p className="col-span-2 text-xs text-muted-foreground">
              Scroll to send a signal. Your receiver does this 50 times a second.
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
