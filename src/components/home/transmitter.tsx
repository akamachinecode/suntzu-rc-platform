"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export interface TxService {
  id: string;
  short: string;
  cta: string;
  title: string;
  lead: string;
}

/** Switch names as they're silk-screened on most modern radios. */
const SWITCHES = ["SA", "SB", "SC", "SD", "SE"];

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

/**
 * The pre-flight control check, when nobody is touching the radio: full right, left,
 * up and down on the right stick, a rudder wag, and the throttle left near idle.
 */
function controlCheck(t: number): Sticks {
  const phase = (t % CHECK_LOOP) / CHECK_LOOP;
  const step = Math.floor(phase * 9);
  const within = (phase * 9) % 1;
  const swing = Math.sin(within * Math.PI); // out and back within each step
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

/** A channel's pulse, the number the receiver actually sends the servo. */
const pulseOf = (value: number, fromZero = false) =>
  Math.round(fromZero ? 1000 + 1000 * value : 1500 + 500 * value);

const pad = (value: number) => String(value).padStart(2, "0");

export function Transmitter({ services }: { services: TxService[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const loadTimer = useRef(0);
  const [seconds, setSeconds] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const target = useRef<Sticks | null>(null);

  // Flight timer: counts up from the moment the page opened, like a radio's TMR.
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // One loop moves both sticks and the channel monitor, written straight to the DOM.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const now: Sticks = { ...CENTRE };
    let frame = 0;
    let last = 0;
    let clock = 0;
    const write = () => {
      const set = (name: string, x: number, y: number) =>
        node
          .querySelector<HTMLElement>(`[data-stick="${name}"]`)
          ?.style.setProperty(
            "transform",
            `translate(${(x * 28).toFixed(1)}px, ${(-y * 28).toFixed(1)}px)`,
          );
      set("left", now.rud, now.thr * 2 - 1);
      set("right", now.ail, now.ele);
      const bars: Array<[string, number, boolean]> = [
        ["ail", now.ail, false],
        ["ele", now.ele, false],
        ["thr", now.thr, true],
        ["rud", now.rud, false],
      ];
      for (const [name, value, fromZero] of bars) {
        const bar = node.querySelector<HTMLElement>(`[data-bar="${name}"]`);
        const label = node.querySelector<HTMLElement>(`[data-us="${name}"]`);
        if (bar) {
          if (fromZero) bar.style.setProperty("transform", `scaleX(${value.toFixed(3)})`);
          else bar.style.setProperty("transform", `scaleX(${(value / 2).toFixed(3)})`);
        }
        const text = `${pulseOf(value, fromZero)}`;
        if (label && label.textContent !== text) label.textContent = text;
      }
    };
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
      write();
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

  // Your mouse is the right thumb: it flies the right stick, and nudges the rudder too.
  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, 1 - ((event.clientY - box.top) / box.height) * 2));
    target.current = { ail: x, ele: y, thr: CENTRE.thr, rud: x * 0.4 };
  };

  const service = selected === null ? null : services[selected];

  useEffect(() => () => window.clearTimeout(loadTimer.current), []);

  return (
    <div>
      <div
        ref={root}
        onPointerMove={steer}
        onPointerLeave={() => (target.current = null)}
        className="relative mx-auto mt-10 max-w-2xl md:mt-6"
      >
        {/* Carry handle and antenna, behind the case */}
        <div
          aria-hidden="true"
          className="absolute -top-7 left-1/2 h-12 w-44 -translate-x-1/2 rounded-t-[2rem] border-[6px] border-b-0 border-tx-edge"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 right-14 h-28 w-4 origin-bottom rotate-[14deg]"
        >
          <div className="h-full rounded-full border-2 border-tx-edge bg-tx-raised" />
          <div className="absolute -bottom-2 left-1/2 size-6 -translate-x-1/2 rounded-full border-2 border-tx-edge bg-tx" />
        </div>

        {/* The case */}
        <div className="relative rounded-[2.25rem] border-2 border-tx-edge bg-tx px-5 pt-6 pb-5 shadow-[10px_10px_0_0_var(--primary)] sm:px-8">
          {/* Grips on both sides */}
          <div
            aria-hidden="true"
            className="absolute top-24 bottom-16 left-1.5 w-2.5 rounded-full grip-ridges opacity-70"
          />
          <div
            aria-hidden="true"
            className="absolute top-24 right-1.5 bottom-16 w-2.5 rounded-full grip-ridges opacity-70"
          />
          {/* Case screws */}
          {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((place) => (
            <span
              key={place}
              aria-hidden="true"
              className={cn(
                "absolute grid size-3 place-items-center rounded-full bg-tx-edge",
                place,
              )}
            >
              <span className="h-px w-2 rotate-45 bg-tx" />
            </span>
          ))}

          {/* Switches: one per service */}
          <div
            className="flex justify-center gap-2 sm:gap-5"
            role="group"
            aria-label="What we can do for you"
          >
            {services.map((item, index) => {
              const on = selected === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setSelected(on ? null : index);
                    // A real radio takes a beat to load a model; so does this one.
                    window.clearTimeout(loadTimer.current);
                    setLoading(!on);
                    loadTimer.current = window.setTimeout(() => setLoading(false), 420);
                  }}
                  className="group flex w-14 flex-col items-center gap-1.5 rounded-lg py-1 text-background focus-visible:outline-primary sm:w-[4.5rem]"
                >
                  <span className="text-[0.65rem] font-bold tracking-wide text-background/60">
                    {SWITCHES[index]}
                  </span>
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
                  <span className="text-center text-[0.7rem] leading-tight font-semibold sm:text-xs">
                    {item.short}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sticks either side of the screen */}
          <div className="mt-5 grid grid-cols-2 items-center gap-4 sm:grid-cols-[auto_1fr_auto] sm:gap-6">
            <Gimbal side="left" className="order-2 sm:order-1" />

            {/* The screen */}
            <div
              aria-live="polite"
              className="order-1 col-span-2 h-[15.5rem] overflow-hidden rounded-xl border-4 border-tx-raised bg-lcd lcd-pixels p-3 font-lcd text-lcd-ink shadow-[inset_0_2px_6px_rgb(0_0_0/0.25)] sm:order-2 sm:col-span-1"
            >
              <div className="flex justify-between text-base leading-none">
                <span>{service ? `MDL ${pad((selected ?? 0) + 1)}` : "SERVO CREW"}</span>
                <span>
                  TMR {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)} · TX 7.4V
                </span>
              </div>
              <div className="mt-1 h-px bg-lcd-ink/40" />
              {service && loading ? (
                <p className="mt-2 text-2xl leading-none">
                  LOADING MDL {pad((selected ?? 0) + 1)}
                  <span className="animate-pulse motion-reduce:animate-none"> ▮▮▮</span>
                </p>
              ) : service ? (
                <div className="mt-2">
                  <p className="text-2xl leading-none">{service.title}</p>
                  <p className="mt-1.5 text-lg leading-tight">{service.lead}</p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-2xl leading-none">3 PILOTS · SOUTH FLORIDA</p>
                  <p className="mt-1.5 text-lg leading-tight">
                    Planes, helis and cars. Flip a switch to see what we&apos;ll do for you.
                  </p>
                </div>
              )}
              <div className="mt-3 grid gap-1 text-sm leading-none" aria-hidden="true">
                {(["ail", "ele", "thr", "rud"] as const).map((name) => (
                  <div
                    key={name}
                    className="grid grid-cols-[2.25rem_1fr_2.75rem] items-center gap-2"
                  >
                    <span>{name.toUpperCase()}</span>
                    <span className="relative h-2 border border-lcd-ink/70">
                      <span
                        data-bar={name}
                        className={cn(
                          "absolute inset-y-0 w-full bg-lcd-ink",
                          name === "thr" ? "left-0 origin-left" : "left-1/2 origin-left",
                        )}
                        style={{ transform: "scaleX(0)" }}
                      />
                      {name === "thr" ? null : (
                        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-lcd-ink" />
                      )}
                    </span>
                    <span data-us={name} className="text-right tabular-nums">
                      1500
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Gimbal side="right" className="order-3" />
          </div>

          {/* Bottom edge: power light and the engraved name */}
          <div className="mt-4 flex items-center justify-between px-1 text-tx-edge">
            <span className="flex items-center gap-2 text-xs font-semibold text-background/50">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
              />
              PWR
            </span>
            <Wordmark className="text-xl text-tx-edge" />
            <span className="text-xs font-semibold text-background/50">2.4 GHz</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-background/70">
        {service ? (
          <Link
            href={`/contact?topic=${service.id}`}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {service.cta}
          </Link>
        ) : (
          "Flip a switch. Your mouse is the right stick."
        )}
      </p>
    </div>
  );
}

/** A gimbal: a recessed well with a crosshair, a stick and trim tabs. */
function Gimbal({ side, className }: { side: "left" | "right"; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid justify-items-center gap-2", className)}>
      <div className="relative grid size-24 place-items-center rounded-2xl border-2 border-tx-edge bg-[color-mix(in_oklab,var(--tx)_80%,black)] shadow-[inset_0_3px_8px_rgb(0_0_0/0.6)] sm:size-28 lg:size-32">
        <span className="absolute inset-x-3 top-1/2 h-px bg-tx-edge" />
        <span className="absolute inset-y-3 left-1/2 w-px bg-tx-edge" />
        <span className="absolute size-20 rounded-full border border-tx-edge" />
        <span
          data-stick={side}
          className="relative grid size-9 place-items-center rounded-full border-2 border-tx-edge bg-tx-raised shadow-[0_6px_10px_rgb(0_0_0/0.5)] will-change-transform"
        >
          <span className="size-5 rounded-full border border-tx-edge bg-[repeating-conic-gradient(var(--tx-edge)_0_10deg,transparent_10deg_20deg)]" />
        </span>
      </div>
      <span className="h-1.5 w-20 rounded-full bg-tx-raised">
        <span className="mx-auto block h-full w-1 bg-tx-edge" />
      </span>
    </div>
  );
}
