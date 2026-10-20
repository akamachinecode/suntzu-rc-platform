"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** A giant word that slides sideways while its section passes through the viewport. */
export function DriftWord({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["6%", "-18%"]);

  return (
    <div ref={ref} aria-hidden="true" className={cn("overflow-hidden", className)}>
      <motion.p
        style={{ x }}
        className="text-[22vw] leading-[0.8] font-black tracking-tighter whitespace-nowrap font-wide select-none"
      >
        {children}
      </motion.p>
    </div>
  );
}
