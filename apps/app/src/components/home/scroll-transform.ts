"use client";

import { type MotionValue, type TransformOptions, useSpring, useTransform } from "motion/react";
import { useSyncExternalStore } from "react";

/**
 * Scroll-linked motion on the home page, done two ways.
 *
 * - On a touch screen the parts read the scroll directly: a CSS transform tied to the scroll,
 *   which the browser runs on its compositor (a scroll-driven animation). They stay in step with
 *   the finger, at the screen's frame rate, even while the page is busy.
 * - On a computer (a mouse or a trackpad) they glide: they follow the scroll through a light
 *   spring, the eased feel that smooth-scroll libraries gave the whole page, but only on these
 *   parts, so the page itself scrolls natively and never lags behind the wheel.
 *
 * Under reduced motion, or before the page is interactive, they read the scroll directly.
 */
const GLIDES = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Settles in about a fifth of a second, without overshooting. */
const SPRING = { stiffness: 300, damping: 40, restDelta: 0.0002 } as const;

function subscribe(onChange: () => void) {
  const list = window.matchMedia(GLIDES);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** Whether scroll-linked parts glide here (a computer) rather than read the scroll directly. */
export function useGlides() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(GLIDES).matches,
    () => false,
  );
}

/**
 * A `transform` tied to scroll progress: `output` across `range`. Bind `value` as the element's
 * `transform` and use `key` as its key, so the element is bound afresh when the mode changes.
 */
export function useScrollTransform(
  progress: MotionValue<number>,
  range: number[],
  output: string[],
  options?: TransformOptions<string>,
) {
  const glides = useGlides();
  const eased = useSpring(progress, SPRING);
  const direct = useTransform(progress, range, output, options);
  const glided = useTransform(eased, range, output, options);
  return glides ? { key: "glide", value: glided } : { key: "direct", value: direct };
}

export type ScrollTransform = ReturnType<typeof useScrollTransform>;
