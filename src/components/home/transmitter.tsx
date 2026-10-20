"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export interface TxService {
  id: string;
  short: string;
  cta: string;
}

/** Stick positions: ailerons, elevator and rudder centre at 0; throttle runs 0 … 1. */
interface Sticks {
  ail: number;
  ele: number;
  thr: number;
  rud: number;
}

const CENTRE: Sticks = { ail: 0, ele: 0, thr: 0.18, rud: 0 };
const FOLLOW = 0.12; // seconds for a thumb to get there
const CHECK_LOOP = 9;
const TRAVEL = 28; // px a stick can move from centre

/**
 * The pre-flight control check, when nobody is touching the radio: full right, left,
 * up and down on the right stick, a rudder wag, and a blip of throttle.
 */
function controlCheck(t: number): Sticks {
  const phase = (t % CHECK_LOOP) / CHECK_LOOP;
  const step = Math.floor(phase * 9);
  const swing = Math.sin(((phase * 9) % 1) * Math.PI);
  const pose = { ...CENTRE };
  if (step === 1) pose.ail = swing;
  if (step === 2) pose.ail = -swing;
  if (step === 3) pose.ele = swing;
  if (step === 4) pose.ele = -swing;
  if (step === 5) pose.rud = swing;
  if (step === 6) pose.rud = -swing;
  if (step === 7) pose.thr = CENTRE.thr + 0.5 * swing;
  return pose;
}

/** An RC transmitter: each switch is something we do, and the screen says which. */
export function Transmitter({ services }: { services: TxService[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const target = useRef<Sticks | null>(null);

  // One loop moves both sticks, written straight to the DOM.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const now: Sticks = { ...CENTRE };
    let frame = 0;
    let last = 0;
    let clock = 0;
    const place = (name: string, x: number, y: number) =>
      node
        .querySelector<HTMLElement>(`[data-stick="${name}"]`)
        ?.style.setProperty(
          "transform",
          `translate(${(x * TRAVEL).toFixed(1)}px, ${(-y * TRAVEL).toFixed(1)}px)`,
        );
    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60;
      last = time;
      clock += dt;
      const want = target.current ?? (still.matches ? CENTRE : controlCheck(clock));
      const k = still.matches ? 1 : 1 - Math.exp(-dt / FOLLOW);
      now.ail += (want.ail - now.ail) * k;
      now.ele += (want.ele - now.ele) * k;
      now.thr += (want.thr - now.thr) * k;
      now.rud += (want.rud - now.rud) * k;
      place("left", now.rud, now.thr * 2 - 1);
      place("right", now.ail, now.ele);
      frame = requestAnimationFrame(tick);
    };
    const visible = new IntersectionObserver((entries) => {
      if (entries.at(-1)?.isIntersecting) {
        if (!frame) {
          last = 0;
          frame = requestAnimationFrame(tick);
        }
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visible.observe(node);
    return () => {
      visible.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // Your mouse is the right thumb.
  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, 1 - ((event.clientY - box.top) / box.height) * 2));
    target.current = { ail: x, ele: y, thr: CENTRE.thr, rud: x * 0.4 };
  };

  const service = selected === null ? null : services[selected];

  return (
    <div>
      <div
        ref={root}
        onPointerMove={steer}
        onPointerLeave={() => (target.current = null)}
        className="relative mx-auto mt-10 max-w-xl md:mt-6"
      >
        {/* Carry handle and antenna, behind the case */}
        <div
          aria-hidden="true"
          className="absolute -top-7 left-1/2 h-12 w-40 -translate-x-1/2 rounded-t-[2rem] border-[6px] border-b-0 border-tx-edge"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 right-12 h-28 w-4 origin-bottom rotate-[14deg] rounded-full border-2 border-tx-edge bg-tx-raised"
        />

        <div className="relative rounded-[2.25rem] border-2 border-tx-edge bg-tx px-4 pt-6 pb-4 shadow-[10px_10px_0_0_var(--primary)] sm:px-8">
          {/* Switches: one per thing we do */}
          <div className="flex justify-center gap-1 sm:gap-6" role="group" aria-label="What we do">
            {services.map((item, index) => {
              const on = selected === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(on ? null : index)}
                  className="group flex w-[3.25rem] flex-col items-center gap-2 rounded-lg py-1 text-background focus-visible:outline-primary sm:w-16"
                >
                  <span
                    aria-hidden="true"
                    className="relative grid h-11 w-7 place-items-center rounded-md border-2 border-tx-edge bg-tx-raised"
                  >
                    <span className="size-2.5 rounded-full bg-tx-edge" />
                    <span
                      className={cn(
                        "absolute left-1/2 h-6 w-2 -translate-x-1/2 rounded-full border border-tx-edge transition-transform duration-200 ease-out motion-reduce:transition-none",
                        on
                          ? "bottom-1/2 origin-bottom -rotate-6 bg-primary"
                          : "top-1/2 origin-top rotate-6 bg-background/80 group-hover:-rotate-6",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-center text-xs leading-tight font-semibold",
                      on ? "text-primary" : "text-background/70",
                    )}
                  >
                    {item.short}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Two sticks and the screen between them */}
          <div className="mt-5 grid grid-cols-2 items-center gap-4 sm:grid-cols-[auto_1fr_auto] sm:gap-6">
            <Gimbal side="left" className="order-2 sm:order-1" />
            <div
              aria-live="polite"
              className="order-1 col-span-2 grid h-28 place-items-center rounded-xl border-4 border-tx-raised bg-lcd lcd-pixels px-3 text-center font-lcd text-lcd-ink shadow-[inset_0_2px_6px_rgb(0_0_0/0.25)] sm:order-2 sm:col-span-1"
            >
              <p className="text-3xl leading-none">{service ? service.short : "Flip a switch"}</p>
            </div>
            <Gimbal side="right" className="order-3" />
          </div>

          <div className="mt-4 flex justify-center">
            <Wordmark className="text-xl text-tx-edge" />
          </div>
        </div>
      </div>

      {/* Reserve the line so the page doesn't jump when a switch is flipped. */}
      <p className="mt-6 h-5 text-center text-sm">
        {service ? (
          <Link
            href={`/contact?topic=${service.id}`}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {service.cta}
          </Link>
        ) : null}
      </p>
    </div>
  );
}

/** A gimbal: a recessed well with a crosshair and a stick. */
function Gimbal({ side, className }: { side: "left" | "right"; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid justify-items-center", className)}>
      <div className="relative grid size-24 place-items-center rounded-2xl border-2 border-tx-edge bg-[color-mix(in_oklab,var(--tx)_80%,black)] shadow-[inset_0_3px_8px_rgb(0_0_0/0.6)] sm:size-28">
        <span className="absolute inset-x-3 top-1/2 h-px bg-tx-edge" />
        <span className="absolute inset-y-3 left-1/2 w-px bg-tx-edge" />
        <span
          data-stick={side}
          className="relative grid size-9 place-items-center rounded-full border-2 border-tx-edge bg-tx-raised shadow-[0_6px_10px_rgb(0_0_0/0.5)] will-change-transform"
        >
          <span className="size-5 rounded-full border border-tx-edge bg-[repeating-conic-gradient(var(--tx-edge)_0_10deg,transparent_10deg_20deg)]" />
        </span>
      </div>
    </div>
  );
}
