"use client";

import { useEffect, useRef } from "react";
import {
  nextRatio,
  PHONE_FRAME_MS,
  PHONE_SLOW_FRAME_MS,
  SLOW_FRAME_MS,
  WINDOW,
} from "@/components/scenes/quality";
import type { Build, Stage } from "@/components/scenes/toy";
import { cn } from "@/lib/utils";

// Each diorama is its own chunk.
const SCENES = {
  airfield: () => import("@/components/scenes/airfield"),
  helipad: () => import("@/components/scenes/helipad"),
  "dirt-track": () => import("@/components/scenes/dirt-track"),
} satisfies Record<string, () => Promise<{ build: Build }>>;

export type SceneName = keyof typeof SCENES;

/**
 * Building a diorama (its WebGL context, its geometry, its shaders) keeps a phone busy for a few
 * hundred milliseconds. Done as the visitor scrolls towards it, that froze the page mid-scroll,
 * so the dioramas are built one at a time, in page order, after the page has loaded, when the
 * browser is idle and the page hasn't scrolled for a moment (the visitor is reading). A diorama
 * the visitor reaches before its turn is built straight away.
 */
const queue: (() => Promise<void>)[] = [];
let draining = false;
let lastScroll = 0;
const QUIET_MS = 300;

const idle = () =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 200); // Safari
  });

async function quiet() {
  for (let wait = QUIET_MS; wait > 0; wait = lastScroll + QUIET_MS - performance.now()) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  const onScroll = () => {
    lastScroll = performance.now();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  if (document.readyState !== "complete") {
    await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
  }
  for (let job = queue.shift(); job; job = queue.shift()) {
    await quiet();
    await idle();
    await job();
  }
  window.removeEventListener("scroll", onScroll);
  draining = false;
}

function whenIdle(job: () => Promise<void>) {
  queue.push(job);
  void drain();
}

/**
 * A 3D diorama on a transparent canvas. It is built when the browser is idle, runs only while
 * on screen, and shows one still frame under reduced motion. On a phone (a touch screen) it draws
 * 30 times a second, scrolling or not, which leaves the graphics chip room for the scroll. The
 * hard shadow is the same offset ink shadow the hero's parts have.
 */
export function ToyStage({
  scene,
  label,
  className,
}: {
  scene: SceneName;
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = box.current;
    const surface = canvas.current;
    if (!element || !surface) return;
    let live = true;
    let started = false;
    let controls: Stage | null = null;
    let frame = 0;
    let visible = false;
    let clock = 0;
    let last = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(pointer: coarse)").matches;
    const frameMs = phone ? PHONE_FRAME_MS - 2 : 0; // a little early, so 60 Hz screens draw every other frame
    const slowMs = phone ? PHONE_SLOW_FRAME_MS : SLOW_FRAME_MS;

    // Time between the frames drawn since the scene last started running, to lower its
    // sharpness on a device that can't keep up (scenes/quality.ts).
    let intervals: number[] = [];

    const loop = (now: number) => {
      if (!controls) return;
      frame = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      intervals.push(now - last);
      clock += Math.min(0.05, (now - last) / 1000);
      last = now;
      if (intervals.length >= WINDOW) {
        const ratio = nextRatio(controls.pixelRatio(), intervals, slowMs);
        if (ratio !== controls.pixelRatio()) controls.setPixelRatio(ratio);
        intervals = [];
      }
      controls.draw(clock);
    };
    const run = () => {
      cancelAnimationFrame(frame);
      if (!controls) return;
      if (still.matches) {
        controls.draw(controls.still);
      } else if (visible) {
        intervals = [];
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };

    const load = async () => {
      if (started) return;
      started = true;
      const [{ stage }, { build }] = await Promise.all([
        import("@/components/scenes/toy"),
        SCENES[scene](),
      ]);
      if (!live) return;
      let built: Stage;
      try {
        built = stage(surface, build);
      } catch {
        return; // no WebGL: the section reads fine without its diorama
      }
      await built.ready;
      if (!live) {
        built.dispose();
        return;
      }
      controls = built;
      clock = controls.still;
      controls.draw(clock);
      run();
    };
    whenIdle(load);

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect();
          void load();
        }
      },
      { rootMargin: "300px 0px" },
    );
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      run();
    });
    // Resizing clears the canvas, so draw the current moment again straight away.
    const resize = new ResizeObserver(() => {
      if (!controls) return;
      controls.resize();
      controls.draw(still.matches ? controls.still : clock);
    });
    near.observe(element);
    onScreen.observe(element);
    resize.observe(element);
    still.addEventListener("change", run);

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      near.disconnect();
      onScreen.disconnect();
      resize.disconnect();
      still.removeEventListener("change", run);
      controls?.dispose();
    };
  }, [scene]);

  return (
    <div ref={box} role="img" aria-label={label} className={cn("relative", className)}>
      <canvas
        ref={canvas}
        className="absolute inset-0 size-full drop-shadow-[6px_6px_0_var(--foreground)]"
      />
    </div>
  );
}
