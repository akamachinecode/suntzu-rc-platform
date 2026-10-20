"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A giant word that slides in from the right as its section arrives and comes to rest on
 * the page margin, in line with the content below it.
 */
export function DriftWord({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  // Moving while the word's top travels from the bottom of the screen to 35% down it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.35"] });
  const x = useTransform(scrollYProgress, [0, 1], ["30%", "0%"]);

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
  }, [children]);

  return (
    <div ref={ref} aria-hidden="true" className={cn("overflow-hidden", className)}>
      <div className="mx-auto max-w-7xl px-4">
        <motion.p
          ref={word}
          style={reduce ? undefined : { x }}
          className="text-[min(22vw,20rem)] leading-[0.8] font-black tracking-tighter whitespace-nowrap font-wide select-none"
        >
          {children}
        </motion.p>
      </div>
    </div>
  );
}
