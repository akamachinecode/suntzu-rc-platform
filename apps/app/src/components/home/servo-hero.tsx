"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { BenchPart, LipoPack, Propeller, Wheel } from "@/components/home/bench-parts";
import { useScrollTransform } from "@/components/home/scroll-transform";
import { Tag } from "@/components/home/tag";
import { Button } from "@workspace/ui/components/button";

// A standard servo reads a pulse every 20 ms: 1000 µs is one end, 2000 µs the other.
const PULSE_MIN = 1000;
const PULSE_MAX = 2000;
const TRAVEL = 45; // degrees either side of centre
const VIEW = { width: 500, height: 380 };
const PIVOT = { x: 250, y: 262 };
// The prop spins up like a throttle opening: three turns, slow at first.
const throttle = (p: number) => p * p;

/**
 * The page's scroll position is the radio signal: scrolling sweeps the servo horn end to end.
 *
 * The horn, the prop and the wheel turn with transforms tied to the scroll: on a phone the
 * browser runs them on its compositor, in step with the finger even when the page is busy, and
 * on a computer they glide (`scroll-transform.ts`). Only the small readouts (µs, degrees and the
 * pulse) are drawn by JavaScript.
 */
export function ServoHero() {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  const pulse = useTransform(scrollYProgress, [0, 1], [PULSE_MIN, PULSE_MAX]);
  const angle = useTransform(pulse, [PULSE_MIN, PULSE_MAX], [-TRAVEL, TRAVEL]);
  const hornTurn = useScrollTransform(
    scrollYProgress,
    [0, 1],
    [`rotate(${-TRAVEL}deg)`, `rotate(${TRAVEL}deg)`],
  );
  // The pinned box is a screen tall and centres its content, so it ends with empty space
  // that depends on the screen. Pull the next section up over it: the page's own section
  // padding is then the only gap after the hero.
  const pinned = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = pinned.current;
    if (!box || !track.current) return;
    const fit = () => {
      const bottom = Math.max(
        ...Array.from(box.children, (child) => {
          const el = child as HTMLElement;
          return el.offsetTop + el.offsetHeight;
        }),
      );
      if (track.current) track.current.style.marginBottom = `${bottom - box.clientHeight}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  const pulseText = useTransform(pulse, (p) => Math.round(p).toString());
  const angleText = useTransform(angle, (a) => `${a > 0.5 ? "+" : ""}${Math.round(a)}°`);
  // Waveform window shows the first 3 ms of the frame: 100 px per millisecond.
  const wave = useTransform(pulse, (p) => {
    const fall = 20 + (p / 1000) * 100;
    return `M 0 70 H 20 V 14 H ${fall} V 70 H 320`;
  });
  // The same signal reaches the rest of the bench: the prop spins up like a throttle
  // opening, the wheel rolls.
  const reduce = useReducedMotion();
  const propSpin = useScrollTransform(
    scrollYProgress,
    [0, 1],
    ["rotate(0deg)", `rotate(${reduce ? 0 : 1080}deg)`],
    { ease: throttle },
  );
  const wheelRoll = useScrollTransform(
    scrollYProgress,
    [0, 1],
    ["rotate(0deg)", `rotate(${reduce ? 0 : -360}deg)`],
  );

  return (
    <section
      ref={track}
      aria-labelledby="hero-title"
      className="relative h-[260vh] overflow-x-clip"
    >
      {/* Safe centring: on a screen too short for it all, the headline stays at the top
          instead of sliding under the header. */}
      <div
        ref={pinned}
        className="sticky top-[var(--header)] mx-auto grid h-[calc(100svh-var(--header))] max-w-7xl [align-content:safe_center] gap-6 px-5 py-4 sm:gap-8 sm:px-6 sm:py-6 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12"
      >
        <div className="flex flex-col items-start gap-4 sm:gap-5 md:gap-7">
          <h1
            id="hero-title"
            className="text-[2.6rem] leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          >
            Small machines. <Tag tone="sky">Serious</Tag> engineering.
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

        <div className="relative">
          {/* Parts under the card, peeking out from behind it */}
          <BenchPart
            className="-top-10 -left-12 w-28 max-md:hidden lg:w-32 xl:-top-14 xl:-left-16 xl:w-36"
            spin={wheelRoll}
            delay={0.45}
          >
            <Wheel />
          </BenchPart>
          <BenchPart className="-bottom-14 -left-56 w-72 max-xl:hidden" tilt={-7} delay={0.55}>
            <LipoPack />
          </BenchPart>
          <figure className="relative rounded-xl border-2 border-foreground bg-panel shadow-hard-lg">
            {/* The horn is drawn on its own layer over the servo so that it can turn as an
                HTML transform about the output spline, which the compositor can run. */}
            <div className="relative">
              <svg
                viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
                role="img"
                aria-label="A standard servo seen from above. Its output horn turns as the page scrolls."
                className="block h-auto max-h-[26svh] w-full sm:max-h-[38svh] md:max-h-[46svh]"
              >
                {/* mounting tabs */}
                <rect x="70" y="240" width="360" height="56" rx="8" fill="#000" />
                <circle cx="96" cy="268" r="9" fill="var(--panel)" />
                <circle cx="404" cy="268" r="9" fill="var(--panel)" />
                {/* case */}
                <rect x="120" y="196" width="260" height="146" rx="14" fill="#000" />
                {/* output spline boss */}
                <circle cx={PIVOT.x} cy={PIVOT.y} r="40" fill="#3a3a37" />
              </svg>
              <motion.div
                key={hornTurn.key}
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  transform: hornTurn.value,
                  // The pivot sits at the middle across, and at its height in the drawing: the
                  // drawing keeps its proportions, so both hold at any size.
                  transformOrigin: `${(PIVOT.x / VIEW.width) * 100}% ${(PIVOT.y / VIEW.height) * 100}%`,
                }}
              >
                <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="block size-full">
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
                </svg>
              </motion.div>
            </div>

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
                  <line
                    key={x}
                    x1={x}
                    x2={x}
                    y1="8"
                    y2="76"
                    stroke="var(--muted)"
                    strokeWidth="2"
                  />
                ))}
                <motion.path
                  d={wave}
                  fill="none"
                  stroke="#000"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <text
                  x="120"
                  y="84"
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--muted-foreground)"
                >
                  1 ms
                </text>
                <text
                  x="220"
                  y="84"
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--muted-foreground)"
                >
                  2 ms
                </text>
              </svg>
              <p className="col-span-2 text-xs text-muted-foreground">
                Scroll to send a signal. Your receiver does this 50 times a second.
              </p>
            </figcaption>
          </figure>
          {/* The prop lies on top of the card, across its corner */}
          <BenchPart
            className="-top-18 -right-3.5 w-32 min-[1440px]:-right-20 min-[1440px]:w-64 md:-top-22 md:-right-4 md:w-40 xl:-top-28 xl:w-52"
            spin={propSpin}
            tilt={28}
            delay={0.35}
          >
            <Propeller />
          </BenchPart>
        </div>
      </div>
    </section>
  );
}
