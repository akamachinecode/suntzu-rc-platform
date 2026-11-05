import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";

// Real titles from the DeLand RC and Coral Springs RC Track calendars (2026-10-22).
describe("classify", () => {
  it.each([
    ["Jets Over Deland", "fly-in"],
    ["Memorial Fun Fly, Club meeting, BBQ", "fly-in"],
    ["Triple header - Breakfast - Club Meeting - Fun Fly", "fly-in"],
    ["Winter Air Fest /Swap Meet", "fly-in"],
    ["Aerofest", "fly-in"],
    ["SF Winter Championship", "competition"],
    ["ROAR Regional", "competition"],
    ["On Road Nationals", "competition"],
    ["Dirt Oval Race", "race"],
    ["Club Race off-road", "race"],
    ["RC Flight Training", "course"],
  ])("%s is a %s", (title, kind) => {
    expect(classify(title)).toMatchObject({ event: true, kind });
  });

  it.each([
    ["Field closed for Car Club event", "notice"],
    ["Weed spraying No flying till after 11am", "notice"],
    ["Presidential TFR  - NO FLYING", "notice"],
    ["Layout Change", "notice"],
    ["board meeting", "club-business"],
    ["Volunteers Meeting - JETS OVER DELAND", "club-business"],
    ["Setup Crew for Fun Fly Event", "club-business"],
    ["Key Exchange & Club dues", "club-business"],
    ["Luncheon buffet", "club-business"],
    ["Practice Day", "practice"],
    ["TBA - On Road Race", "practice"],
    ["Youth Celebration of the arts", "unrecognised"],
  ])("%s is skipped as %s", (title, reason) => {
    expect(classify(title)).toEqual({ event: false, reason });
  });

  it("marks cancellations and removes the word from the name", () => {
    expect(classify("Winter Airfest - CANCELLED")).toEqual({
      event: true,
      kind: "fly-in",
      cancelled: true,
      name: "Winter Airfest",
    });
    expect(classify("Race Cancelled")).toMatchObject({
      kind: "race",
      cancelled: true,
      name: "Race",
    });
  });
});
