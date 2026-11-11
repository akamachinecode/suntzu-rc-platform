"use client";

import { motion, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useRef } from "react";
import { useScrollTransform } from "@/components/home/scroll-transform";
import { cn } from "@/lib/utils";

/**
 * The slide over the word's trip up the screen: fast at first, gentle at the end (an ease-out
 * cubic), done 60% of the way. The "done at 60%" lives in the curve rather than in the input
 * range, because the browser applies an easing to the whole timeline: it then moves the same on
 * the compositor as in JavaScript.
 */
const SLIDE = 0.6;
const settle = (p: number) => 1 - (1 - Math.min(1, p / SLIDE)) ** 3;

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
  // From the word's top at the bottom of the screen to its top at the top (the browser can only
  // run an animation tied to the screen's edges). It eases out, so it is already moving as the
  // word comes into view, and settles onto the margin when the word's top is 40% down the screen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const x = useScrollTransform(scrollYProgress, [0, 1], ["translateX(30%)", "translateX(0%)"], {
    ease: settle,
  });

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
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <motion.p
          key={x.key}
          ref={word}
          style={reduce ? undefined : { transform: x.value }}
          // A layer of its own before it reaches the screen, so its first frame of motion doesn't
          // wait for the browser to draw the word.
          className="text-[min(22vw,20rem)] leading-[0.8] font-black tracking-tighter whitespace-nowrap font-wide will-change-transform select-none"
        >
          {children}
        </motion.p>
      </div>
    </div>
  );
}
