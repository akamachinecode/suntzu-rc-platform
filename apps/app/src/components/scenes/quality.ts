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

/**
 * On a phone a diorama draws at most 30 times a second, so it shares the graphics chip with the
 * page's scrolling; its frames are then 33 ms apart by design.
 */
export const PHONE_FRAME_MS = 1000 / 30;

/** A phone's median frame longer than this (ms) is under about 22 fps. */
export const PHONE_SLOW_FRAME_MS = 45;

/** The pixel ratio a diorama starts at on this screen. */
export function startRatio(devicePixelRatio: number) {
  return Math.min(devicePixelRatio, RATIOS[0]);
}

/**
 * The pixel ratio to draw at next, given the time between the last frames (ms). The median
 * ignores one-off hitches (a page load, a long task), so only steady slowness steps down.
 * `slowMs` is what counts as slow: `PHONE_SLOW_FRAME_MS` when frames are capped at 30 fps.
 */
export function nextRatio(current: number, intervals: readonly number[], slowMs = SLOW_FRAME_MS) {
  if (intervals.length < WINDOW) return current;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (median <= slowMs) return current;
  return RATIOS.find((ratio) => ratio < current) ?? current;
}
