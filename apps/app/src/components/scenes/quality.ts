/**
 * How sharp a diorama is drawn. It starts at the screen's own sharpness (up to 2 device pixels per
 * CSS pixel) and steps down when the device can't keep up, so a slow graphics chip draws fewer
 * pixels instead of dropping frames. Fast devices never step down. It never steps back up: going
 * up and down would make the picture flicker between sharp and soft.
 */

/** The pixel ratios a diorama steps down through. */
export const RATIOS = [2, 1.5, 1] as const;

/** Frames per decision: about three quarters of a second at 60 fps. */
export const WINDOW = 45;

/** A median frame longer than this (ms) is under about 45 fps. */
export const SLOW_FRAME_MS = 22;

/** The pixel ratio a diorama starts at on this screen. */
export function startRatio(devicePixelRatio: number) {
  return Math.min(devicePixelRatio, RATIOS[0]);
}

/**
 * The pixel ratio to draw at next, given the time between the last frames (ms). The median
 * ignores one-off hitches (a page load, a long task), so only steady slowness steps down.
 */
export function nextRatio(current: number, intervals: readonly number[]) {
  if (intervals.length < WINDOW) return current;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (median <= SLOW_FRAME_MS) return current;
  return RATIOS.find((ratio) => ratio < current) ?? current;
}
