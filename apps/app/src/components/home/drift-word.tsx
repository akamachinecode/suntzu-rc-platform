"use client";

import { motion, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useRef } from "react";
import { useScrollTransform } from "@/components/home/scroll-transform";
import { cn } from "@/lib/utils";

/**
 * A giant word that slides in from the right as its section arrives and comes to rest on
 * the page margin, in line with the content below it.
 *
 * The slide is a transform tied to the scroll: on a phone the browser runs it on its compositor,
 * in step with the finger even while the page is busy, and on a computer it glides
 * (`scroll-transform.ts`). Browsers without scroll-driven animations get it from JavaScript.
 */
export function DriftWord({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  // From the word's top at the bottom of the screen to its top at the top. The browser can only
  // run an animation tied to the screen's edges, so the slide takes the first 65% of that: it
  // ends when the word's top is 35% down the screen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const x = useScrollTransform(scrollYProgress, [0, 0.65], ["translateX(30%)", "translateX(0%)"]);

  // At this size a letter's side bearing is visible (an R sits ~20px in from its box), so
  // pull the first letter's ink onto the margin rather than its box.
  useEffect(() => {
    let live = true;
    void document.fonts.ready.then(() => {
      const p = word.current;
      const context = document.createElement("canvas").getContext("2d");
      if (!live || !p || !context) return;
      const style = getComputedStyle(p);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fontStretch = "expanded"; // font-wide
      const bearing = -context.measureText(children.charAt(0)).actualBoundingBoxLeft;
      p.style.marginLeft = `${-bearing / parseFloat(style.fontSize)}em`;
    });
    return () => {
      live = false;
    };
    // A new element when the slide changes mode (x.key), so measure again.
  }, [children, x.key]);

  return (
    <div ref={ref} aria-hidden="true" className={cn("overflow-hidden", className)}>
      <div className="mx-auto max-w-7xl px-4">
        <motion.p
          key={x.key}
          ref={word}
          style={reduce ? undefined : { transform: x.value }}
          className="text-[min(22vw,20rem)] leading-[0.8] font-black tracking-tighter whitespace-nowrap font-wide select-none"
        >
          {children}
        </motion.p>
      </div>
    </div>
  );
}
