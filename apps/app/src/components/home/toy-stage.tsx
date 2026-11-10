"use client";

import { useEffect, useRef } from "react";
import { nextRatio, WINDOW } from "@/components/scenes/quality";
import type { Build, Stage } from "@/components/scenes/toy";
import { cn } from "@/lib/utils";

// Each diorama is its own chunk, fetched when its section comes near.
const SCENES = {
  airfield: () => import("@/components/scenes/airfield"),
  helipad: () => import("@/components/scenes/helipad"),
  "dirt-track": () => import("@/components/scenes/dirt-track"),
} satisfies Record<string, () => Promise<{ build: Build }>>;

export type SceneName = keyof typeof SCENES;

/**
 * A 3D diorama on a transparent canvas. It loads when the section is near, runs only while
 * on screen, and shows one still frame under reduced motion. The hard shadow is the same
 * offset ink shadow the hero's parts have.
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
    let controls: Stage | null = null;
    let frame = 0;
    let visible = false;
    let clock = 0;
    let last = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Time between the frames drawn since the scene last started running, to lower its
    // sharpness on a device that can't keep up (scenes/quality.ts).
    let intervals: number[] = [];

    const loop = (now: number) => {
      if (!controls) return;
      intervals.push(now - last);
      clock += Math.min(0.05, (now - last) / 1000);
      last = now;
      if (intervals.length >= WINDOW) {
        const ratio = nextRatio(controls.pixelRatio(), intervals);
        if (ratio !== controls.pixelRatio()) controls.setPixelRatio(ratio);
        intervals = [];
      }
      controls.draw(clock);
      frame = requestAnimationFrame(loop);
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
      const [{ stage }, { build }] = await Promise.all([
        import("@/components/scenes/toy"),
        SCENES[scene](),
      ]);
      if (!live) return;
      try {
        controls = stage(surface, build);
      } catch {
        return; // no WebGL: the section reads fine without its diorama
      }
      clock = controls.still;
      controls.draw(clock);
      run();
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect();
          void load();
        }
      },
      { rootMargin: "600px 0px" },
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
