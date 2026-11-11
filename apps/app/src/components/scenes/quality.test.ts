import { describe, expect, it } from "vitest";
import {
  nextRatio,
  PHONE_FRAME_MS,
  PHONE_SLOW_FRAME_MS,
  SLOW_FRAME_MS,
  startRatio,
  WINDOW,
} from "./quality";

const frames = (ms: number, count = WINDOW) => Array.from({ length: count }, () => ms);

describe("diorama sharpness", () => {
  it("starts at the screen's sharpness, up to 2", () => {
    expect(startRatio(1)).toBe(1);
    expect(startRatio(1.25)).toBe(1.25);
    expect(startRatio(3)).toBe(2);
  });

  it("stays sharp while the device keeps up at 60 fps", () => {
    expect(nextRatio(2, frames(16.7))).toBe(2);
  });

  it("steps down one level at a time when frames are steadily slow", () => {
    expect(nextRatio(2, frames(40))).toBe(1.5);
    expect(nextRatio(1.5, frames(40))).toBe(1);
    expect(nextRatio(1.25, frames(40))).toBe(1);
  });

  it("never goes below 1", () => {
    expect(nextRatio(1, frames(80))).toBe(1);
  });

  it("ignores a few hitches", () => {
    const hitches = [...frames(16.7, WINDOW - 10), ...frames(200, 10)];
    expect(nextRatio(2, hitches)).toBe(2);
  });

  it("on a phone, keeps its sharpness at the 30 fps it is capped at", () => {
    expect(nextRatio(2, frames(PHONE_FRAME_MS), PHONE_SLOW_FRAME_MS)).toBe(2);
    expect(nextRatio(2, frames(60), PHONE_SLOW_FRAME_MS)).toBe(1.5);
  });

  it("waits for a full window before deciding", () => {
    expect(nextRatio(2, frames(SLOW_FRAME_MS * 3, WINDOW - 1))).toBe(2);
  });
});
