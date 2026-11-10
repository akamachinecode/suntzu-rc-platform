import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COVERS, drawCover, type CoverName } from "./draw";

// The home page shows the guide covers as SVG files instead of drawing thousands of paths into
// every page (docs/DECISIONS.md, 2026-11-10). They must match the figures they come from:
// after changing a figure, run `pnpm --filter @workspace/app covers` to redraw them.
describe("guide covers", () => {
  for (const name of Object.keys(COVERS) as CoverName[]) {
    it(`${name}.svg is the current drawing of its figure`, () => {
      const file = new URL(`./${name}.svg`, import.meta.url);
      const drawn = drawCover(name);
      if (process.env.UPDATE_COVERS) writeFileSync(file, drawn);
      expect(
        readFileSync(file, "utf8") === drawn,
        `${name}.svg is out of date: run pnpm --filter @workspace/app covers`,
      ).toBe(true);
    });

    it(`${name}.svg has no comment a browser would refuse`, () => {
      // "--" inside an XML comment makes the file invalid, and the image shows as broken.
      const comments = drawCover(name).match(/<!--[\s\S]*?-->/g) ?? [];
      expect(comments.every((comment) => !comment.slice(4, -3).includes("--"))).toBe(true);
    });
  }
});
