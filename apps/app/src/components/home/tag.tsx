"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const TONES = {
  sky: "bg-sky",
  lead: "bg-lead",
  primary: "bg-primary",
} as const;

export type Tone = keyof typeof TONES;

/**
 * Words on a block of colour, slapped on like a sticker the first time they're seen: the
 * site's one way of highlighting part of a headline.
 */
export function Tag({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn(
        "-my-[0.08em] inline-block rounded-lg border-2 border-foreground px-[0.12em] pb-[0.04em] text-foreground shadow-hard",
        TONES[tone],
        className,
      )}
      initial={reduce ? false : { scale: 1.3, rotate: 9 }}
      whileInView={{ scale: 1, rotate: -2 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.2 }}
    >
      {children}
    </motion.span>
  );
}
